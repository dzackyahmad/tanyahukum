# Laporan Pengujian Non-Fungsional — TanyaHukum

> **Dokumen:** Dokumentasi Teknis PPL-II (bagian 4.2.3) · **Tanggal pengujian:** 16 Oktober 2026
> Response time dibahas lengkap di [EVALUASI_RESPONSE_TIME.md](EVALUASI_RESPONSE_TIME.md); dokumen ini memuat ringkasannya beserta pengujian non-fungsional lainnya.

---

## 1. Ringkasan

| No | Jenis pengujian | Alat | Hasil |
|---|---|---|---|
| 1 | Response time end-to-end | `scripts/e2e_response_time.mjs` | Default (Flash-Lite · Kilat) selesai rata-rata **4,5 dtk**; versi lama 19,6 dtk |
| 2 | Performa endpoint (beban ringan) | `tests/performance/run-smoke.mjs` | 59 request, **0 error** |
| 3 | E2E browser | Playwright (Chromium) | **8/8 lulus** |
| 4 | Uji tombol Stop end-to-end | `scripts/e2e_stop.mjs` | **Lulus**: AI berhenti, tidak ada yang disimpan |
| 5 | Keamanan statis | `run-security-checks.mjs`, `npm audit` | Tidak ada temuan terbuka di jalur produksi |
| 6 | Ketersediaan (fallback model) | Unit test + uji langsung | Fallback langsung (sebelumnya tertahan ±100 dtk) |
| 7 | Preferensi gaya jawaban (uji langsung ke API) | Pertanyaan sama, preferensi berbeda | Default: 172 kata, Bahasa Indonesia. "English + Ringkas": 61 kata, Bahasa Inggris, kutipan sumber tetap ada |

## 2. Response Time

**Cara:** skrip mengirim 2 pertanyaan nyata (spesifik dan luas) ke `POST /api/chat` di server lokal untuk setiap model/mode. Waktu dicatat dari event streaming: waktu pencarian, teks pertama, dan selesai. Chat uji langsung dihapus.

| Model · Mode | Teks pertama | Selesai (rata-rata) |
|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat *(default)* | 1,5–3,7 dtk | **4,5 dtk** |
| Qwen 3.8 · Kilat | 2,8–3,5 dtk | 5,2 dtk |
| GPT-OSS 120B · Berpikir | 3,3–3,7 dtk | 5,2 dtk |
| Gemini 3.6 Flash · Kilat | 9,3–10,1 dtk | 12,8 dtk |
| Gemini 3.5 Flash · Berpikir | 10,4–12,1 dtk | 14,2 dtk |
| Gemini 3.6 Flash · Berpikir | 10,0–13,8 dtk | 15,1 dtk |
| *Versi lama* | *6,9–24,6 dtk* | *19,6 dtk* |

Faktor terbesar: batas Voyage gratis (3 request/menit) dan proses berpikir model.

## 3. Performa Endpoint

**Cara:** `npm run test:perf:smoke` mengirim request GET bersamaan (10 concurrent) ke tiga endpoint, lalu menghitung persentil waktu respons.

| Endpoint | Request | Error | Status | p50 | p95 |
|---|---|---|---|---|---|
| `GET /api/dashboard` (tanpa login) | 26 | 0 | 401 (sesuai harapan) | 87 ms | 165 ms |
| `GET /api/regulations` | 17 | 0 | 200 | 626 ms | 1.383 ms |
| `GET /api/payment/webhook` (health) | 16 | 0 | 200 | 22 ms | 603 ms |

Diukur pada server *development* (kompilasi on-demand), sehingga angka produksi lebih kecil.

## 4. E2E Browser (Playwright)

**Cara:** Playwright membuka Chromium headless ke server lokal. Untuk halaman yang butuh login, sesi akun uji dibuat dengan menandatangani JWT (cookie `token`). Test **tidak mengirim pertanyaan**, sehingga tidak memakai kuota AI.

| ID | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|
| TC-E2E-01 | Buka halaman utama | Halaman termuat, URL benar | ✅ |
| TC-E2E-02 | Pemilih model di chat | Default "Gemini 3.5 Flash-Lite · Kilat"; 5 model di atas, 2 mode di bawah; pilih Qwen 3.8 lalu Berpikir mengubah label; pilihan tetap setelah reload | ✅ |
| TC-E2E-03 | Menu model di layar 1280×720 | Menu di dalam layar, bagian Mode terlihat tanpa scroll | ✅ (sebelumnya gagal: BUG-05) |
| TC-E2E-04 | Menu model di layar HP 390×844 | Menu di dalam layar | ✅ |
| TC-E2E-06 | Halaman Kebijakan Privasi | 13 bagian dan 7 FAQ tampil, FAQ bisa dibuka, ganti bahasa ID ↔ EN, pilihan bahasa diingat | ✅ |
| TC-E2E-07 | Halaman Syarat dan Ketentuan | 15 bagian dan 8 FAQ tampil, FAQ bisa dibuka, ganti bahasa ID ↔ EN, pilihan bahasa diingat | ✅ |
| TC-E2E-08 | Halaman legal di HP 390 px tanpa login | Terbuka publik, tanpa scroll horizontal | ✅ |
| TC-E2E-09 | Profil › Akun › Dokumen legal | Tautan membuka tab baru ke halaman yang benar | ✅ |

```powershell
$env:E2E_NO_SERVER="1"; npx playwright test
```

## 5. Uji Tombol Stop End-to-End

**Cara:** `scripts/e2e_stop.mjs` mengirim pertanyaan, lalu memanggil `AbortController.abort()` begitu teks pertama diterima (sama seperti menekan Stop). Setelah menunggu 8 dtk, skrip menghitung pesan dan chat di akun uji.

| Teks pertama | Stop ditekan | Pesan sebelum → sesudah | Chat tersisa | Status |
|---|---|---|---|---|
| 3,9 dtk | 3,9 dtk | 0 → 0 | 0 | ✅ Lulus |

## 6. Keamanan Statis

**Cara:** `node tests/security/run-security-checks.mjs` memeriksa pola berisiko di kode. `node tests/security/run-npm-audit.mjs` memeriksa kerentanan dependency.

| Temuan | Tingkat | Status | Penjelasan |
|---|---|---|---|
| S2: bypass signature webhook di non-production | Kritis (statis) | Diterima (by design) | Hanya aktif jika `NODE_ENV ≠ production` untuk uji sandbox lokal. Di Vercel signature selalu wajib valid (diuji `TC-INT-PAY-06`). |
| S3: dua library JWT | Tinggi (statis) | Dimitigasi | `jose` dan `jsonwebtoken` dikunci ke HS256 dengan secret yang sama. |
| `npm audit`: 37 advisory (1 kritis, 13 tinggi, 23 sedang) | — | Dipantau | Hampir semuanya dependency pengembangan (jest, tailwind, eslint, prisma CLI) yang tidak ikut ke produksi. `nodemailer`: opsi `raw` yang rentan tidak dipakai. Perbaikan butuh upgrade major, jadi ditunda agar alur tidak rusak. |

## 7. Ketersediaan & Kuota (Tier Gratis)

| Batas terukur | Nilai | Penanganan di aplikasi |
|---|---|---|
| Gemini Flash-Lite | 15 request/menit, 500/hari per project | Default; cadangan untuk model lain |
| Gemini 3.6 Flash / 3.5 Flash | 20 request/hari per project | Jika habis → otomatis Flash-Lite |
| Groq (GPT-OSS, Qwen) | 8.000 token/menit, 1.000 request/hari | Konteks dibatasi 20 potongan; jika ditolak → Gemini |
| Voyage (embedding) | 3 request/menit | Cache embedding per server |

Bila model gagal **sebelum** menulis jawaban (kuota habis, server sibuk, stream rusak), jawaban otomatis dibuat model cadangan dan panel Proses menampilkan keterangan "model cadangan".
