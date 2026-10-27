// Membuat grafik PNG untuk Dokumentasi_27Okt.md (SVG → screenshot Playwright).
// Data: ragas/results/scores_v3.json (lewat summary) & ragas/results/evidence_calibration.json.
// Pemakaian (dari folder tanyahukum/): node tests/PPL-II/dokumentasi_27Okt/sumber_gambar/ambil_grafik.mjs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('@playwright/test');
const OUT = 'tests/PPL-II/dokumentasi_27Okt/gambar/grafik';

const C = { surface: '#fcfcfb', text: '#0b0b0b', text2: '#52514e', muted: '#8a8984', grid: '#e7e6e2', s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (v) => v.toFixed(3).replace('.', ',');

// ── G01: skor Ragas 10 mode (dot plot; sumbu tidak harus mulai dari 0) ──
const ragas = [
  ['Gemini 3.6 Flash · Kilat', 0.883, false], ['Gemini 3.5 Flash · Kilat', 0.881, true],
  ['Gemini 3.5 Flash · Berpikir', 0.881, false], ['Gemini 3.5 Flash-Lite · Berpikir', 0.872, true],
  ['Gemini 3.5 Flash-Lite · Kilat', 0.869, false], ['Qwen 3.8 · Kilat', 0.868, false],
  ['Gemini 3.6 Flash · Berpikir', 0.862, true], ['GPT-OSS 120B · Berpikir', 0.823, false],
  ['Qwen 3.8 · Berpikir', 0.813, true], ['GPT-OSS 120B · Kilat', 0.809, true],
];
function g01() {
  const W = 1100, rowH = 40, top = 110, left = 300, right = 120, H = top + ragas.length * rowH + 70;
  const x0 = 0.78, x1 = 0.90, X = (v) => left + ((v - x0) / (x1 - x0)) * (W - left - right);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI, Arial, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="${C.surface}"/>`;
  s += `<text x="24" y="38" font-size="20" font-weight="600" fill="${C.text}">Skor Ragas per model &amp; mode (rata-rata 4 metrik LLM)</text>`;
  s += `<text x="24" y="62" font-size="13" fill="${C.text2}">Faithfulness, Answer Relevancy, Answer Correctness, Factual Correctness · 10 soal · juri Gemini 3.5 Flash-Lite · semua di atas target</text>`;
  // legenda
  s += `<circle cx="30" cy="88" r="6" fill="${C.s1}"/><text x="42" y="92" font-size="13" fill="${C.text2}">Dievaluasi 16 Okt</text>`;
  s += `<circle cx="180" cy="88" r="6" fill="${C.s2}"/><text x="192" y="92" font-size="13" fill="${C.text2}">Dievaluasi 27 Okt (baru)</text>`;
  for (let v = 0.78; v <= 0.9001; v += 0.02) {
    s += `<line x1="${X(v)}" y1="${top - 8}" x2="${X(v)}" y2="${top + ragas.length * rowH}" stroke="${C.grid}" stroke-width="1"/>`;
    s += `<text x="${X(v)}" y="${top + ragas.length * rowH + 22}" font-size="12" fill="${C.muted}" text-anchor="middle">${v.toFixed(2).replace('.', ',')}</text>`;
  }
  ragas.forEach(([label, v, isNew], i) => {
    const y = top + i * rowH + rowH / 2;
    s += `<text x="${left - 16}" y="${y + 5}" font-size="14" fill="${C.text}" text-anchor="end">${esc(label)}</text>`;
    s += `<line x1="${X(x0)}" y1="${y}" x2="${X(v)}" y2="${y}" stroke="${isNew ? C.s2 : C.s1}" stroke-width="2" stroke-opacity="0.35"/>`;
    s += `<circle cx="${X(v)}" cy="${y}" r="7" fill="${isNew ? C.s2 : C.s1}" stroke="${C.surface}" stroke-width="2"/>`;
    s += `<text x="${X(v) + 14}" y="${y + 5}" font-size="13" fill="${C.text2}">${fmt(v)}</text>`;
  });
  s += `<text x="${(left + W - right) / 2}" y="${H - 14}" font-size="12" fill="${C.muted}" text-anchor="middle">Skor (0–1; sumbu dimulai 0,78 agar selisih terlihat)</text></svg>`;
  return s;
}

// ── G02: kalibrasi ambang skor dokumen (strip plot) ──
const cal = JSON.parse(fs.readFileSync('tests/PPL-II/ragas/results/evidence_calibration.json', 'utf8'));
const groups = [
  ['A_ada_di_database', 'Hukum — dokumen ADA di database', C.s1],
  ['B_hukum_mungkin_tidak_ada', 'Hukum — kemungkinan TIDAK ada', C.s2],
  ['C_di_luar_hukum', 'Di luar hukum', C.s3],
];
function g02() {
  const W = 1100, top = 120, bandH = 90, left = 300, right = 60, H = top + groups.length * bandH + 80;
  const x0 = 0.40, x1 = 0.75, X = (v) => left + ((v - x0) / (x1 - x0)) * (W - left - right);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI, Arial, sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="${C.surface}"/>`;
  s += `<text x="24" y="38" font-size="20" font-weight="600" fill="${C.text}">Kalibrasi ambang "kekuatan dukungan dokumen"</text>`;
  s += `<text x="24" y="62" font-size="13" fill="${C.text2}">Skor kemiripan Pinecone (voyage-law-2) potongan teratas · 18 pertanyaan · satu titik = satu pertanyaan</text>`;
  for (let v = 0.40; v <= 0.7501; v += 0.05) {
    s += `<line x1="${X(v)}" y1="${top - 20}" x2="${X(v)}" y2="${top + groups.length * bandH}" stroke="${C.grid}" stroke-width="1"/>`;
    s += `<text x="${X(v)}" y="${top + groups.length * bandH + 22}" font-size="12" fill="${C.muted}" text-anchor="middle">${v.toFixed(2).replace('.', ',')}</text>`;
  }
  for (const [v, label] of [[0.5, 'tidak_ada < 0,50'], [0.57, 'terbatas < 0,57']]) {
    s += `<line x1="${X(v)}" y1="${top - 30}" x2="${X(v)}" y2="${top + groups.length * bandH}" stroke="${C.text2}" stroke-width="2" stroke-dasharray="6 5"/>`;
    s += `<text x="${X(v) + 6}" y="${top - 34}" font-size="12" font-weight="600" fill="${C.text2}">${label}</text>`;
  }
  groups.forEach(([key, label, color], gi) => {
    const yc = top + gi * bandH + bandH / 2;
    const rows = cal[key];
    const vals = rows.map((r) => r.top1);
    s += `<text x="${left - 16}" y="${yc - 2}" font-size="14" font-weight="600" fill="${C.text}" text-anchor="end">${esc(label)}</text>`;
    s += `<text x="${left - 16}" y="${yc + 16}" font-size="12" fill="${C.text2}" text-anchor="end">n=${rows.length} · ${fmt(Math.min(...vals))}–${fmt(Math.max(...vals))}</text>`;
    s += `<line x1="${X(Math.min(...vals))}" y1="${yc}" x2="${X(Math.max(...vals))}" y2="${yc}" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>`;
    rows.forEach((r, i) => {
      const jitter = ((i % 3) - 1) * 9;
      s += `<circle cx="${X(r.top1)}" cy="${yc + jitter}" r="6" fill="${color}" stroke="${C.surface}" stroke-width="2"><title>${esc(r.q)}: ${fmt(r.top1)}</title></circle>`;
    });
  });
  s += `<text x="${(left + W - right) / 2}" y="${H - 18}" font-size="12" fill="${C.muted}" text-anchor="middle">Skor kemiripan potongan teratas</text></svg>`;
  return s;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, svg] of [['G01_skor_ragas_10_mode', g01()], ['G02_kalibrasi_ambang_dokumen', g02()]]) {
  await page.setContent(`<html><body style="margin:0;background:${C.surface}">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: `${OUT}/${name}.png` });
  console.log('ok', name);
}
await browser.close();
