// Uji response time end-to-end ke server lokal (localhost:3000) dengan akun uji.
// Pemakaian (dari folder tanyahukum/): node tests/PPL-II/scripts/e2e_response_time.mjs <label> <mode> <jedaSebelumTiapPertanyaanDetik>
// Setiap chat yang dibuat langsung dihapus lagi.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(process.cwd() + '/package.json');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { SignJWT } = await import(pathToFileURL(process.cwd() + '/node_modules/jose/dist/webapi/index.js').href);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const [label, mode, waitSec = '0'] = process.argv.slice(2);
const BASE = 'http://localhost:3000';
const QUESTIONS = [
  'Berapa lama maksimal perjanjian kerja waktu tertentu (PKWT)?',
  'Apa hak istirahat dan cuti tahunan pekerja?',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const user = await prisma.user.findUnique({ where: { email: 'test@mail.com' } });
const token = await new SignJWT({ userId: user.id, email: user.email, tier: user.tier, role: user.role })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m')
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const headers = { 'Content-Type': 'application/json', Cookie: `token=${token}` };
const RUN_STARTED = new Date();

const results = [];
try {
  for (const q of QUESTIONS) {
    if (Number(waitSec) > 0) await sleep(Number(waitSec) * 1000);
    const t0 = performance.now();
    const res = await fetch(`${BASE}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: q, stream: true, mode }) });
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = '', first = null, searchStart = null, searchMs = null, done = null, answer = '', sources = null, model = null, err = null; const models = [];
    for (;;) {
      const { value, done: end } = await reader.read(); if (end) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines.filter(Boolean)) {
        const e = JSON.parse(l); const now = performance.now() - t0;
        if (e.type === 'step' && e.step === 'search' && e.state === 'active') searchStart = now;
        if (e.type === 'step' && e.step === 'search' && e.state === 'done') searchMs = now - searchStart;
        if (e.type === 'sources') sources = e;
        if (e.type === 'model') { model = e.model; models.push(e.model + (e.fallback ? ' (cadangan)' : '')); }
        if (e.type === 'text') { answer += e.text; if (first === null) first = now; }
        if (e.type === 'done') done = { ...e, at: now };
        if (e.type === 'error') err = e.error;
      }
    }
    if (done?.chatId) await fetch(`${BASE}/api/chat?chatId=${done.chatId}`, { method: 'DELETE', headers });
    // Kuota harian dihitung dari PromptUsage → catatan pemakaian akun uji dari skrip ini ikut dibersihkan
    await prisma.promptUsage.deleteMany({ where: { userId: user.id, createdAt: { gte: RUN_STARTED } } });
    results.push({ q, first, total: done?.at, searchMs, words: answer.split(/\s+/).filter(Boolean).length, filtered: sources?.filtered, model: models.join(' -> '), err });
  }
} finally {
  const left = await prisma.chat.count({ where: { userId: user.id } });
  await prisma.$disconnect();
  const s = (ms) => (ms == null ? '-' : (ms / 1000).toFixed(1).replace('.', ',') + ' dtk');
  for (const r of results) {
    console.log(`${label.padEnd(26)}| ${r.q.slice(0, 28).padEnd(28)} | cari ${s(r.searchMs).padStart(8)} | teks pertama ${s(r.first).padStart(8)} | selesai ${s(r.total).padStart(8)} | ${String(r.words).padStart(3)} kata | disaring ${r.filtered ?? '-'} | ${r.model ?? 'model lama'}${r.err ? ' | ERROR ' + r.err : ''}`);
  }
  console.log(`(sisa chat akun uji: ${left})`);
}
