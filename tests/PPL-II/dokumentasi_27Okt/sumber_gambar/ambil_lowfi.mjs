// Render wireframe low-fi (wireframe_lowfi.html) menjadi PNG per frame.
// Pemakaian (dari folder tanyahukum/): node tests/PPL-II/dokumentasi_27Okt/sumber_gambar/ambil_lowfi.mjs
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
const require = createRequire(process.cwd() + '/package.json');
const { chromium } = require('@playwright/test');
const DIR = 'tests/PPL-II/dokumentasi_27Okt';
const names = {
  L01: 'L01_profil_penggunaan', L02: 'L02_chat_pemberitahuan_fallback', L03: 'L03_chat_guardrail_hukum',
  L04: 'L04_chat_permintaan_internal_diblok', L05: 'L05_langganan_pro_30_hari', L06: 'L06_sidebar_profil_menempel',
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(pathToFileURL(path.resolve(`${DIR}/sumber_gambar/wireframe_lowfi.html`)).href);
for (const [id, name] of Object.entries(names)) {
  await page.locator(`#${id}`).screenshot({ path: `${DIR}/gambar/lowfi/${name}.png` });
  console.log('ok', name);
}
await browser.close();
