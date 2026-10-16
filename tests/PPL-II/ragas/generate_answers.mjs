// Tahap 1 evaluasi Ragas: membuat jawaban dari sistem TanyaHukum yang sebenarnya.
// - Jawaban diambil dari POST /api/chat (server lokal) untuk setiap mode/model → prompt,
//   penyaringan konteks, dan konfigurasi model sama persis dengan aplikasi.
// - Konteks diambil ulang dengan langkah retrieval yang sama dengan server
//   (Voyage voyage-law-2 → Pinecone topK 50 → cleanMatches), karena API tidak mengirim isi konteks.
// - Hasil disimpan bertahap (bisa dilanjutkan bila terputus). Chat uji langsung dihapus.
//
// Pemakaian (dari folder tanyahukum/, server lokal harus menyala):
//   node tests/PPL-II/ragas/generate_answers.mjs [mode1,mode2,...]
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import fs from 'fs';
const require = createRequire(process.cwd() + '/package.json');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { SignJWT } = await import(pathToFileURL(process.cwd() + '/node_modules/jose/dist/webapi/index.js').href);
const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

const DIR = 'tests/PPL-II/ragas';
const OUT = `${DIR}/rag_results_v3.json`;
const BASE = 'http://localhost:3000';
const MODES = (process.argv[2] || 'lite,fast,deep,next,gptoss,qwen').split(',');
const VOYAGE_GAP_MS = 21000; // Voyage gratis: 3 request/menit
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Salinan langkah retrieval dari app/api/chat/route.js (harus tetap sama) ──
const MIN_KEEP = 5;
function isNoiseChunk(text) {
  const t = (text || '').trim();
  if (t.length < 40) return true;
  const pipes = (t.match(/\|/g) || []).length;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (pipes >= 10 && letters / t.length < 0.45) return true;
  if (pipes >= 20 && letters / pipes < 6) return true;
  return false;
}
function cleanMatches(matches) {
  const seen = new Set();
  const kept = [];
  matches.forEach((m, i) => {
    const text = (m.metadata?.text || '').trim();
    const key = text.replace(/\s+/g, ' ').toLowerCase();
    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    if (i >= MIN_KEEP && isNoiseChunk(text)) return;
    kept.push(m);
  });
  return kept;
}
const chunkText = (m) => `[Sumber: ${m.metadata?.title || 'Tidak diketahui'} | Hal: ${m.metadata?.page || '?'}]\n${m.metadata?.text || ''}`;

async function retrieveContexts(question) {
  const er = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VOYAGEAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: [question], model: 'voyage-law-2', input_type: 'query' }),
  });
  const ej = await er.json();
  if (!ej.data) throw new Error('Voyage: ' + JSON.stringify(ej).slice(0, 200));
  const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY }).Index(process.env.PINECONE_INDEX_V2);
  const res = await index.query({ vector: ej.data[0].embedding, topK: 50, includeMetadata: true });
  return cleanMatches(res.matches || []).map(chunkText);
}

// ── Akun uji ──
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: 'test@mail.com' } });
const token = await new SignJWT({ userId: user.id, email: user.email, tier: user.tier, role: user.role })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('3h')
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const headers = { 'Content-Type': 'application/json', Cookie: `token=${token}` };
const RUN_STARTED = new Date();

async function ask(question, mode) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: question, stream: true, mode }) });
  if (!res.ok) return { error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', answer = '', first = null, done = null, err = null, contextChunks = null;
  const models = [];
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const l of lines.filter(Boolean)) {
      const e = JSON.parse(l);
      if (e.type === 'model') { models.push({ model: e.model, provider: e.provider, fallback: !!e.fallback }); contextChunks = e.contextChunks; }
      if (e.type === 'text') { answer += e.text; if (first === null) first = performance.now() - t0; }
      if (e.type === 'done') done = e;
      if (e.type === 'error') err = e.error;
    }
  }
  if (done?.chatId) await fetch(`${BASE}/api/chat?chatId=${done.chatId}`, { method: 'DELETE', headers });
  // Kuota harian dihitung dari PromptUsage → catatan pemakaian yang dibuat skrip ini di akun uji
  // ikut dibersihkan (seperti chat ujinya), agar akun uji FREE tidak terkena limit saat evaluasi.
  await prisma.promptUsage.deleteMany({ where: { userId: user.id, createdAt: { gte: RUN_STARTED } } });
  const final = models.at(-1) || {};
  return {
    response: done?.answer ?? answer,
    model: final.model, provider: final.provider, fallback: !!final.fallback,
    contextChunks, firstTextMs: first && Math.round(first), totalMs: Math.round(performance.now() - t0),
    error: err,
  };
}

// ── Jalankan ──
const questions = JSON.parse(fs.readFileSync(`${DIR}/test_questions_v3.json`, 'utf8'));
const results = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 2));

let lastVoyage = 0;
try {
  for (const q of questions) {
    const r = (results[q.id] ||= { id: q.id, user_input: q.user_input, reference: q.reference, answers: {} });
    if (!r.contexts) {
      await sleep(Math.max(0, lastVoyage + VOYAGE_GAP_MS - Date.now()));
      r.contexts = await retrieveContexts(q.user_input);
      lastVoyage = Date.now();
      save();
    }
    for (const mode of MODES) {
      if (r.answers[mode]?.response && !r.answers[mode].error && !r.answers[mode].fallback) continue;
      // Pertanyaan pertama per id memicu embedding di server → jaga jarak Voyage juga
      if (Object.keys(r.answers).length === 0) {
        await sleep(Math.max(0, lastVoyage + VOYAGE_GAP_MS - Date.now()));
        lastVoyage = Date.now();
      }
      let a = await ask(q.user_input, mode);
      // Gangguan sementara (error / jatuh ke model cadangan) → coba sekali lagi dengan model yang sama
      if (a.error || a.fallback) {
        console.log(`${q.id.padEnd(12)} ${mode.padEnd(8)} percobaan ulang (${a.error || 'model cadangan ' + a.model})`);
        await sleep(15000);
        a = await ask(q.user_input, mode);
      }
      r.answers[mode] = a;
      save();
      console.log(`${q.id.padEnd(12)} ${mode.padEnd(8)} ${a.error ? 'ERROR ' + a.error : `${(a.totalMs / 1000).toFixed(1)} dtk | ${a.model}${a.fallback ? ' (CADANGAN)' : ''} | ${a.response.split(/\s+/).length} kata | konteks ${a.contextChunks}`}`);
      // Groq gratis ±8 rb token/menit → beri jeda setelah mode Groq
      if (a.provider === 'groq') await sleep(20000);
    }
  }
} finally {
  const left = await prisma.chat.count({ where: { userId: user.id } });
  console.log(`Selesai. Sisa chat akun uji: ${left}`);
  await prisma.$disconnect();
}
