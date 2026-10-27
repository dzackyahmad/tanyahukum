// Kalibrasi ambang "kekuatan dukungan dokumen" (lib/legalGuardrails.js → EVIDENCE_THRESHOLDS).
// Mengukur skor kemiripan Pinecone (voyage-law-2, cosine) potongan teratas untuk 3 kelompok:
//   A. pertanyaan hukum yang dokumennya ADA di database (dataset Ragas + pertanyaan umum)
//   B. pertanyaan hukum yang kemungkinan TIDAK ada di database
//   C. pertanyaan di luar hukum
// Tidak memanggil model AI. Jeda 21 dtk per pertanyaan (Voyage gratis: 3 request/menit).
//
// Pemakaian (dari folder tanyahukum/): node tests/PPL-II/scripts/calibrate_evidence.mjs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.cwd() + '/package.json');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { Pinecone } = require('@pinecone-database/pinecone');

const ragas = JSON.parse(fs.readFileSync('tests/PPL-II/ragas/test_questions_v3.json', 'utf8'));
const GROUPS = {
  A_ada_di_database: [
    ...ragas.slice(0, 3).map((q) => q.user_input),
    ...ragas.slice(5, 8).map((q) => q.user_input),
    'Apa saja hak pekerja yang mengalami PHK sepihak?',
    'Apa saja hak cuti melahirkan menurut UU Ketenagakerjaan?',
    'Berapa lama maksimal PKWT berdasarkan jangka waktu?',
  ],
  B_hukum_mungkin_tidak_ada: [
    'Bagaimana prosedur pendaftaran merek dagang di DJKI?',
    'Apa sanksi pidana pencemaran nama baik menurut UU ITE?',
    'Berapa batas usia minimal menikah di Indonesia?',
    'Bagaimana tata cara mengajukan grasi kepada Presiden?',
  ],
  C_di_luar_hukum: [
    'Bagaimana resep rendang padang yang enak?',
    'Cara membuat website dengan Python dan Flask',
    'Siapa juara piala dunia sepak bola 2022?',
    'Rekomendasi film horor terbaru tahun ini',
    'Tips menurunkan berat badan dengan cepat',
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const index = new Pinecone({ apiKey: process.env.PINECONE_API_KEY }).Index(process.env.PINECONE_INDEX_V2);

async function topScores(question) {
  const er = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.VOYAGEAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: [question], model: 'voyage-law-2', input_type: 'query' }),
  });
  const ej = await er.json();
  if (!ej.data) throw new Error('Voyage: ' + JSON.stringify(ej).slice(0, 200));
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await index.query({ vector: ej.data[0].embedding, topK: 5, includeMetadata: true });
      break;
    } catch (err) {
      if (attempt >= 3) throw err;
      console.log(`  koneksi Pinecone gagal (${err.message.slice(0, 60)}), coba lagi...`);
      await sleep(3000);
    }
  }
  const m = res.matches || [];
  return { top1: m[0]?.score ?? 0, top5avg: m.reduce((s, x) => s + x.score, 0) / (m.length || 1), title: m[0]?.metadata?.title || '-' };
}

const out = {};
let first = true;
for (const [group, questions] of Object.entries(GROUPS)) {
  out[group] = [];
  for (const q of questions) {
    if (!first) await sleep(21000);
    first = false;
    const s = await topScores(q);
    out[group].push({ q, ...s });
    console.log(`${group.padEnd(26)} top1 ${s.top1.toFixed(3)} | top5 ${s.top5avg.toFixed(3)} | ${q.slice(0, 60)} → ${s.title.slice(0, 50)}`);
  }
}
fs.writeFileSync('tests/PPL-II/ragas/results/evidence_calibration.json', JSON.stringify(out, null, 2));
for (const [g, rows] of Object.entries(out)) {
  const t = rows.map((r) => r.top1);
  console.log(`${g}: min ${Math.min(...t).toFixed(3)} | maks ${Math.max(...t).toFixed(3)}`);
}
