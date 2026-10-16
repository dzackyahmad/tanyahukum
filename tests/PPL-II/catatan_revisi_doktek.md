# Catatan Revisi Doktek — "Dokumentasi Teknis PPL1-TanyaHukum-2026.docx"

> **Dokumen yang ditinjau:** `Dokumentasi Teknis PPL1-TanyaHukum-2026.docx` (versi terakhir 6.0, 17 Juni 2026; 102 + 16 + 20 gambar, 63 tabel)
> **Dibandingkan dengan:** kode aplikasi saat ini (17 Okt 2026) dan [dokumentasi_teknis_updated_16Okt.md](dokumentasi_teknis_updated_16Okt.md)
> **Rencana perbaikan gambar:** [plan.md](plan.md)

**Arti prioritas**
- 🔴 **Wajib**: isi salah atau bertentangan dengan aplikasi sekarang.
- 🟡 **Perlu ditambah**: fitur atau hasil baru yang belum ada.
- ⚪ **Disarankan**: kerapian atau kejelasan.

Kolom "Sumber isi baru" menunjuk ke bagian di `dokumentasi_teknis_updated_16Okt.md` (disingkat **DTU**) yang bisa disalin.

---

## 0. Ringkasan Perubahan Besar Sejak Versi 6.0

| # | Perubahan di aplikasi | Bagian doktek yang terdampak |
|---|---|---|
| 1 | **Multi-model AI:** 5 model × mode Kilat/Berpikir (Gemini 3.5 Flash-Lite *default*, Gemini 3.6 Flash, Gemini 3.5 Flash, GPT-OSS 120B, Qwen 3.8). Gemini 2.5 Flash sudah **dihapus**. | 2.1, 2.2, 2.5, 2.7.1–2.7.8, 2.7.14, 3.3 |
| 2 | **Streaming jawaban** + panel "Proses" (tahap, dokumen yang dibaca, ringkasan berpikir, waktu) | 2.2.1, 2.7.5–2.7.6, 3.1, 3.3.7 |
| 3 | Tombol **Stop**, **Edit** pertanyaan yang dihentikan, **Salin** pesan | 2.2.1, use case, flowchart, 3.1 |
| 4 | **Fallback otomatis** ke model cadangan (kuota habis / server sibuk / stream rusak) | 2.2.2, 2.7.5–2.7.6, 3.3.7 |
| 5 | **Kuota harian berbasis tabel baru `PromptUsage`** (hapus riwayat tidak mengembalikan kuota) | 2.7.9, 2.7.10 ERD, 3.2, DFD, sequence |
| 6 | **Hapus semua riwayat chat** (Profil › Akun, konfirmasi 2 langkah), endpoint baru `DELETE /api/chat/history` | 2.2.1, use case, API, KF |
| 7 | **Personalisasi AI**: 7 preferensi gaya jawaban (ala ChatGPT) | 2.2.1, 2.6.4, 3.1, API, KF |
| 8 | Halaman **Kebijakan Privasi** & **Syarat dan Ketentuan** (ID/EN, FAQ) | 2.2.1, 3.1, KF |
| 9 | **Sitasi bisa diklik**, endpoint baru `GET /api/regulations/resolve` | 2.2.1, API |
| 10 | **Profil berbentuk modal dengan tab** (Profile, Personalisasi, Tampilan, Keamanan, Akun); tampilan Akun disederhanakan | 2.6.5, 3.1 |
| 11 | Optimasi **response time**: default rata-rata **4,5 dtk** (dulu 10–20 dtk) | 2.2.2, 2.7.13, 4.2.3 |
| 12a | **Akses halaman:** tautan utama `tanyahukum.vercel.app` (`/`) langsung membuka Chatbot (sebelumnya placeholder "Tailwind OK"); Dashboard dan Pusat Data **wajib login** (tamu dialihkan ke Chatbot). Chatbot, Kebijakan Privasi, dan S&K tetap bisa dibuka tamu | 2.2.2, 2.7.1, 3.1, 4.2.5 |
| 12 | **9 bug + 1 celah keamanan diperbaiki**; **232 unit test + 9 E2E** (dulu 145 kasus); **Ragas v3** dengan 5 model | BAB IV |

---

## 1. Bagian Awal Dokumen

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| Catatan Sejarah Perbaikan (Tabel 1.1) | Versi terakhir 6.0 (17 Juni 2026) | Tambah baris **7.0 · 17 Oktober 2026**. *Penyuntingan:* multi-model AI, streaming & panel Proses, Stop/Edit/Salin, kuota `PromptUsage`, hapus semua riwayat, personalisasi AI, dokumen legal, pembaruan diagram. *Perbaikan:* 9 bug + 1 celah keamanan, pengujian ulang (232 unit, 9 E2E), evaluasi response time, Ragas v3. | 🔴 |
| Daftar Isi / Daftar Tabel / Daftar Gambar | — | **Update field** di Word (klik kanan → *Update Field* → *Entire table*) setelah semua gambar dan tabel baru dimasukkan | 🔴 |
| Sampul / header | — | Pastikan tahun dan versi ikut diubah ke 7.0 | ⚪ |

## 2. BAB I Pengantar

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 1.1 Ringkasan | "...use case diagram dan activity diagram..." | Sebutkan juga DFD, flowchart, sequence, CFG white box, evaluasi response time, dan Ragas, karena semuanya ada di BAB II/IV | ⚪ |
| 1.3 Referensi | **"Mårten Widenius et al. (2022), terkait sistem manajemen basis data MySQL"** | **Salah:** database yang dipakai adalah **PostgreSQL (Supabase)**, bukan MySQL. Ganti dengan referensi PostgreSQL/Prisma | 🔴 |
| 1.3 Referensi | Perpres 33/2012 (JDIHN) | Tetap boleh, tetapi sumber data aktual adalah **JDIH BPK** (<https://peraturan.bpk.go.id/>), jadi tambahkan sebagai sumber | 🟡 |
| 1.3 Referensi | — | Tambahkan: UU 27/2022 (Pelindungan Data Pribadi, dasar Kebijakan Privasi); UU 28/2014 Pasal 42 (peraturan tidak dilindungi hak cipta); Ragas (Es et al., 2023); McCabe (1976) untuk kompleksitas siklomatik | 🟡 |
| 1.4 Singkatan (Tabel 1.2) | 8 singkatan | Tambah: LLM, JWT, CSRF, IDOR, SSRF, E2E, NDJSON, OCR, TTFT, RPD/RPM/TPM, UU PDP (lihat DTU 1.4) | 🟡 |

## 3. BAB II Perancangan

### 2.1–2.5 Deskripsi, Fungsi, Batasan, Pengguna, Lingkup

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 2.1 Deskripsi | Fitur: chatbot, manajemen pengguna, dashboard, subscription, pusat data | Tambah paragraf tentang pemilihan model & mode, streaming dan panel Proses, sitasi bisa diklik, personalisasi gaya jawaban, dokumen legal (DTU 2.1) | 🟡 |
| 2.2.1 Sistem Berlangganan | "...termasuk proses aktivasi, **perpanjangan**, dan pembatasan akses..." | **Tidak ada perpanjangan/masa berlaku** di kode. Pembayaran berhasil langsung mengubah tier menjadi PRO (tanpa expiry). Hapus kata "perpanjangan" atau tulis sebagai rencana | 🔴 |
| 2.2.1 Halaman Admin | "...mengubah **role** pengguna menjadi FREE, PRO, maupun ADMIN" | **Role** = USER/ADMIN, sedangkan **tier** = FREE/PRO (dua kolom berbeda). Tulis: "mengubah role (USER/ADMIN) dan paket (FREE/PRO) serta batas kuota" | 🔴 |
| 2.2.1 | 6 fungsi utama | Tambah fungsi baru: pemilih model & mode; panel Proses; Stop/Edit/Salin; hapus semua riwayat; kuota harian; personalisasi AI; Kebijakan Privasi & S&K; sitasi bisa diklik; saran pertanyaan & onboarding; disclaimer AI (tabel F-01–F-25 di DTU 2.2.1) | 🟡 |
| 2.2.2 Availability | "...respons AI ... sekitar **10–20 detik**" | Update: mode default selesai rata-rata **4,5 dtk** (teks pertama 1,5–3,7 dtk); mode Berpikir 12–15 dtk (DTU 4.2.3) | 🔴 |
| 2.2.2 Keamanan | Hanya hashing password | Tambah: JWT httpOnly, proteksi CSRF, rate limit, anti-IDOR, anti-SSRF, whitelist preferensi (anti prompt injection), **guard halaman** (Admin hanya ADMIN; Dashboard & Pusat Data wajib login) | 🟡 |
| 2.2.2 Skalabilitas | "...melalui mekanisme caching..." | Sebutkan yang memang ada: cache embedding (LRU), cache dashboard 30 dtk, klien Pinecone/Voyage dipakai ulang | ⚪ |
| 2.2.2 | — | Tambah poin **ketersediaan/fallback model** saat kuota tier gratis habis | 🟡 |
| 2.3 Ketergantungan Data | "Data hukum ... bersumber dari **JDIHN**" | Sumber aktual: **JDIH BPK (peraturan.bpk.go.id)**, diambil dengan `scripts/scraper.js`. Tambahkan juga: dari 5.000 regulasi terdaftar, **193 sudah diindeks** (78.313 potongan) | 🔴 |
| 2.3 | — | Tambah batasan: kuota tier gratis (Gemini Flash 20/hari, Flash-Lite 500/hari, Groq 8.000 token/menit, Voyage 3/menit); model Groq hanya membaca 20 potongan dokumen | 🟡 |
| 2.4 Admin | "perubahan role pengguna (FREE, PRO, dan ADMIN)" | Sama seperti di 2.2.1: role USER/ADMIN dan tier FREE/PRO | 🔴 |
| 2.5 Database System | "...didukung oleh **Cloudflare** yang berperan dalam ... caching, serta proteksi terhadap trafik berbahaya" | **Tidak ditemukan konfigurasi Cloudflare sebagai network/security layer** di repo. Yang ada: file dokumen di domain `*.r2.dev` (Cloudflare R2) dan Supabase Storage. Konfirmasi ke tim; jika tidak dipakai, ubah menjadi "Cloudflare R2 sebagai penyimpanan file dokumen regulasi" | 🔴 |
| 2.5 Server Cloud | "Infrastruktur cloud **atau VPS**" | Sebutkan spesifik: **Vercel** (hosting Next.js), Supabase (PostgreSQL Singapura + Storage), Pinecone | ⚪ |
| 2.5 Artificial Intelligence | "model ... berbasis LLM" (umum) | Sebutkan: Voyage `voyage-law-2` (embedding), Google Gemini API, Groq API (GPT-OSS, Qwen), LlamaParse (OCR saat ingest) | 🟡 |
| 2.5 Integrasi pihak ketiga | Midtrans, Google OAuth | Tambah Gmail SMTP (email reset), Groq, Voyage | 🟡 |
| 2.5 Tools pengujian | Jest, Playwright, Ragas | Tambah: Istanbul coverage, ESLint `complexity`, skrip response time; Ragas memakai juri Gemini 3.5 Flash-Lite | ⚪ |

### 2.6 Rancangan Antarmuka

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 2.6.4 User Flow (teks + Gambar 2.15) | Alur tanpa pemilihan model/mode, personalisasi, dokumen legal | Tambah langkah: pilih model & mode sebelum bertanya; lihat panel Proses; Stop/Edit; Profil › Personalisasi; Profil › Akun (hapus riwayat, dokumen legal). Gambar 2.15 diperbarui (lihat plan.md) | 🟡 |
| 2.6.4 | "...mengelola **preferensi akun**..." | Jelaskan bahwa preferensi = 7 pengaturan gaya jawaban AI, disimpan di browser | ⚪ |
| 2.6.5 Lofi/Hifi | Desain Profile & Chatbot versi lama | Lofi/Hifi adalah artefak desain, sehingga boleh tetap. Tambahkan kalimat bahwa implementasi akhir berkembang (tab Profil, pemilih model, panel Proses). Opsional: tambah Hifi baru (lihat plan.md) | ⚪ |

### 2.7 Rancangan Fungsional

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 2.7.1 Arsitektur (teks) | "External Services terdiri atas **Gemini AI** sebagai LLM..." | LLM: Google Gemini (3.5 Flash-Lite, 3.6 Flash, 3.5 Flash) **dan Groq** (GPT-OSS 120B, Qwen 3.8). Tambah Gmail SMTP dan Supabase Storage | 🔴 |
| 2.7.2 Context (teks) | Entitas: pengguna, admin, Gemini AI, Midtrans, Google OAuth, Supabase Storage | Tambah **Groq**, **Voyage AI**, **Pinecone**, **Gmail SMTP** | 🔴 |
| 2.7.3 Use Case (teks) | "...memiliki **27 use case**"; PRO "kuota penggunaan yang lebih besar" | Tambah use case baru (lihat plan.md G-05), lalu update jumlahnya. PRO = **tanpa batas** pertanyaan harian, bukan sekadar "lebih besar" | 🔴 |
| 2.7.4 DFD (penomoran) | **"Gambar 2.24 DFD Level 1"** muncul di antara 2.51 dan 2.52 | **Salah nomor** (2.24 sudah dipakai untuk Lofi Payment Form 1). Seharusnya 2.52, dan gambar sesudahnya bergeser +1. Selesai dengan *Update Field* setelah caption memakai *Insert Caption* | 🔴 |
| 2.7.4 DFD Level 2 Chatbot (teks) | Proses chatbot dengan Gemini, cek limit dari riwayat chat | Kuota dihitung dari **`PromptUsage`**; LLM dipilih sesuai `mode`; ada fallback dan streaming | 🔴 |
| 2.7.5 / 2.7.6 / 2.7.8 | Flowchart, sequence, dan activity chatbot versi lama | Lihat plan.md (G-10, G-14, G-20) | 🔴 |
| 2.7.9 Data Requirement (Tabel 2.4) | D001–D008 | Tambah **D009 Pemakaian Kuota** (`PromptUsage`: userId + waktu, tidak ikut terhapus bersama chat) dan **D010 Preferensi Pengguna** (localStorage: mode/model, 7 preferensi gaya jawaban, tema) | 🟡 |
| 2.7.10 ERD (teks) | "...terdiri dari **tujuh entitas**..." | **Delapan entitas**: tambah **PromptUsage** (id, userId, createdAt; FK → User ON DELETE CASCADE; indeks userId+createdAt). Tambahkan juga relasi **User–ChatHistory** yang belum disebut di 2.7.10 | 🔴 |
| 2.7.11 Rancangan API | 30 kode API (API-01–API-30) | Tambah **API-31 `DELETE /api/chat/history`** (hapus semua riwayat, body `{confirm:"HAPUS"}`) dan **API-32 `GET /api/regulations/resolve`** (resolve sitasi). Lengkapi API-11 `POST /api/chat` dengan parameter `stream`, `mode` (10 nilai), `preferences`, serta respons NDJSON (DTU 2.7.11) | 🔴 |
| 2.7.11 API-11 | Nama "**Create Chat**" | Lebih tepat "Kirim Pertanyaan ke AI" (endpoint ini menjawab pertanyaan sekaligus membuat chat bila belum ada) | ⚪ |
| 2.7.11 API-17 | "**Update Regulation** · PATCH /api/regulations/{id}" | **Salah fungsi:** endpoint ini hanya **menambah jumlah dilihat** (view count), tidak mengubah regulasi. Ubah nama menjadi "Tambah View Count" | 🔴 |
| 2.7.11 | Hanya tabel kode/method/endpoint | Disarankan menambah kolom Akses (Publik/Login/Admin) dan Rate limit (lihat DTU 2.7.11 a) | ⚪ |
| 2.7.12 KF (Tabel 2.12) | KF-01–KF-10 | Tambah KF baru: pemilihan model & mode; streaming + panel Proses; Stop/Edit/Salin; hapus semua riwayat; kuota harian yang tidak bisa di-reset; personalisasi AI; dokumen legal (lihat DTU 2.7.12) | 🟡 |
| 2.7.13 NF-01 | "...rata-rata sekitar **10–20 detik** per request" | Ganti target dengan "teks pertama ≤ 5 dtk, jawaban lengkap ≤ 10 dtk (mode default)". Hasil: 1,5–3,7 dtk / 4,5 dtk | 🔴 |
| 2.7.13 NF-02 | Target **Answer Relevancy ≥ 0,80, Faithfulness ≥ 0,85, Factual Correctness ≥ 0,80** | ⚠️ Hasil Ragas v3: Faithfulness 0,956–1,000 ✅ dan Answer Relevancy 0,914–0,955 ✅, tetapi **Factual Correctness 0,646–0,796 tidak mencapai 0,80 di semua model**. Pilih salah satu: (a) tulis apa adanya "Factual Correctness belum tercapai" beserta analisisnya, atau (b) sesuaikan target dengan alasan yang jelas. **Jangan** ditulis tercapai | 🔴 |
| 2.7.13 NF-05 | Dashboard dimuat 3–5 dtk | Belum diukur sebagai waktu muat halaman. Yang terukur adalah p50 `GET /api/dashboard` 87 ms (server dev). Tulis apa adanya atau ukur di produksi | ⚪ |
| 2.7.13 NF-06 | Minimal **100 pengguna bersamaan** | Pengujian yang ada memakai **10 request bersamaan** (59–200 request total). Klaim 100 concurrent **belum dibuktikan**; turunkan targetnya atau jalankan uji beban baru | 🔴 |
| 2.7.14 Rencana AI | "lebih dari **1.500 dokumen** ... sekitar 1.500 dokumen regulasi" | Data aktual: **5.000 regulasi terdaftar** (1.688 Ketenagakerjaan, 3.312 Perdata), **193 sudah diindeks** = **78.313 potongan** di Pinecone. Angka 1.500 tidak cocok dengan data mana pun | 🔴 |
| 2.7.14 Generation Layer | "menggunakan model **Gemini 2.5 Flash**" | Ganti dengan daftar model sekarang. Gemini 2.5 Flash sudah tidak dipakai | 🔴 |
| 2.7.14 | — | Tambah: penyaring potongan noise, preferensi gaya jawaban, fallback model, streaming | 🟡 |

## 4. BAB III Implementasi

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 3.1 Halaman Profile | "**TanyaHukum/app/profile/page.js**" + teks "Pengguna **также** dapat melakukan..." | (1) Ada **kata Rusia "также"** (artinya "juga"); ganti menjadi "juga". (2) Pengaturan utama sekarang ada di **modal Profil** (`components/features/profile/ProfileModal.jsx`) dengan 5 tab, bukan hanya halaman `/profile` | 🔴 |
| 3.1 Halaman Chatbot (teks + Gambar 3.5) | Tanpa pemilih model, panel Proses, Stop | Tambah penjelasan: pemilih model/mode (atas: model, bawah: Kilat/Berpikir), panel Proses, sitasi bisa diklik, Stop/Edit/Salin, saran pertanyaan, disclaimer. Tangkapan layar diganti (plan.md G-30) | 🔴 |
| 3.1 Daftar halaman / alur masuk | Bila doktek menyebut halaman Beranda/landing di `/` | Halaman `/` tidak punya tampilan sendiri: langsung dialihkan ke `/chatbot` (BUG-09). Tamu yang membuka `/dashboard` atau `/pusat-data` dialihkan ke `/chatbot` dan bisa login dari sana (BUG-08). Lihat DTU 3.1 dan 2.7.11 b | 🔴 |
| 3.1 | — | Tambah subbagian baru: **Personalisasi AI**, **Akun** (dokumen legal, hapus riwayat, hapus akun), **Kebijakan Privasi**, **Syarat dan Ketentuan** (plan.md G-31–G-35) | 🟡 |
| 3.1 Potongan kode | Kode lama (mis. `localStorage` profile, komentar "INI KUNCINYA!") | Perbarui potongan kode untuk halaman yang berubah (chatbot, profil) atau ringkas menjadi path file + penjelasan. Hapus komentar informal sebelum dikumpulkan | ⚪ |
| 3.2.1 | "Network & Security Layer: **Cloudflare**" | Sama seperti 2.5: konfirmasi ke tim. Jika tidak ada, hapus atau ganti dengan Cloudflare R2 (penyimpanan file) | 🔴 |
| 3.2.2 (teks + Gambar 3.16) | 7 tabel | Tambah **PromptUsage**; Gambar 3.16 diperbarui (plan.md G-36) | 🔴 |
| 3.2.3 SearchLog | "...sehingga setiap aktivitas pencarian **selalu terhubung dengan pengguna**" | **Salah:** `userId` di SearchLog **opsional**, karena pencarian oleh tamu tetap dicatat dengan userId null. Begitu juga `createdBy` di TrendingIssue | 🔴 |
| 3.2.3 Aturan relasi | Belum menyebut aturan hapus | Tambah: Chat, ChatHistory, Transaction, dan PromptUsage memakai **ON DELETE CASCADE** ke User (hapus akun = hapus semua datanya); SearchLog dan TrendingIssue relasi opsional | 🟡 |
| 3.2 | — | Catatan migrasi 16 Okt 2026: tabel PromptUsage ditambahkan tanpa mengubah/menghapus tabel lama (DTU 3.2) | ⚪ |
| 3.3.2 Dataset | "**JDIHN**", "sekitar **1.500 dokumen**" | JDIH BPK; 5.000 terdaftar, 193 diindeks, 78.313 potongan (DTU 3.3.2) | 🔴 |
| 3.3.3 Pre-processing | Langkah umum | Tambah detail nyata: LlamaParse OCR per 25 halaman → `RecursiveCharacterTextSplitter` 1.000/200 → Voyage `voyage-law-2` 1.024 dimensi, batch 20 → Pinecone (ID `reg_<id>_chunk_<n>`, metadata regulationId/title/category/text/page) (DTU 3.3.3) | 🟡 |
| 3.3.4 Model | "model embedding dan LLM" (umum) | Tabel 5 model dengan mode Kilat/Berpikir, batas konteks, dan kuota (DTU 3.3.4); alasan Gemini 2.5 Flash diganti | 🔴 |
| 3.3.6 Hasil Evaluasi | "Evaluasi dilakukan secara **kualitatif**..." | Sudah ada evaluasi **kuantitatif** (Ragas v3, 5 model): ringkasan tabel DTU 3.3.6 | 🔴 |
| 3.3.7 Integrasi | 5 langkah umum | Tambah: streaming NDJSON, parameter `mode`/`preferences`, fallback, Stop (AbortController), cache embedding | 🟡 |

## 5. BAB IV Evaluasi

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| 4.2 (pengantar) | — | Tambah tabel ringkasan semua jenis pengujian (DTU 4.2) | 🟡 |
| 4.2.1 Black Box (Tabel 4.2–4.19) | 145 kasus (Mei 2026) | Pilih salah satu: (a) **ganti** dengan hasil terbaru 232 kasus otomatis (DTU 4.2.1), atau (b) **pertahankan** tabel lama sebagai sejarah lalu tambah tabel baru "Pengujian versi 7.0". Minimal tambahkan kasus baru: TC-STOP, TC-GROQ, TC-MODE, TC-FALLBACK, TC-QUOTA, TC-DELALL, TC-RL, TC-PREF, TC-LOGIN-07/08, TC-ADMIN-QUOTA-01, S-PAGE-01 | 🔴 |
| Tabel 4.3 Chatbot | 18 kasus | Saat ini 54 kasus chat (termasuk streaming, mode, fallback, Stop, kuota, hapus semua) | 🔴 |
| Tabel 4.19 E2E | 1 kasus (homepage) | 9 kasus: homepage, pemilih model (3), uji Stop, Kebijakan Privasi, S&K, halaman legal di HP, tautan Profil › Akun | 🔴 |
| Tabel 4.20 Rekapan | Total 145: 142 PASS, 2 PARTIAL, 1 BY DESIGN | Rekap baru: 232 unit + 9 E2E lulus. Status temuan: S2 *by design*, S3 dimitigasi | 🔴 |
| Tabel 4.16–4.18 Performa | p50/p95 lama | Boleh tetap (sejarah). Tambah hasil uji ulang 17 Okt (DTU 4.2.3 b) dan **evaluasi response time chatbot** (tabel per model) | 🟡 |
| 4.2.2 White Box (teks + Tabel 4.21) | "Branch Coverage **100%**, total **203 branch**, CC rata-rata **6,6**" | Hitungan manual 20 modul. Pengukuran otomatis saat ini: **cabang 75,2%** (Istanbul), CC rata-rata **10,2** (ESLint, 40 handler + middleware). Jangan menulis 100% untuk kode sekarang. Tulis keduanya dengan jelas: "basis path manual (Mei)" dan "coverage terukur (Okt)" | 🔴 |
| WB-01 Login (kode + Gambar 4.1) | Kode lama | Kode login berubah: ada pembandingan ulang password ter-trim (BUG-07) dan rate limit per email. Perbarui potongan kode, CFG, dan basis path | 🔴 |
| WB-10 POST /api/chat (kode + Gambar 4.10) | Kode lama (CC 11) | Kode berubah total: streaming, 10 mode, fallback, Stop, kuota PromptUsage, preferensi. CC sekarang **25**. CFG dan basis path perlu dibuat ulang | 🔴 |
| WB baru | — | Tambah modul WB-21 `DELETE /api/chat/history` dan WB-22 `lib/rateLimit.js` (bug TTL) | 🟡 |
| WB-20 Middleware (Gambar 4.20) + FC Middleware (Gambar 2.64) | Guard hanya `/admin` dan `/api/admin` | Tambah cabang guard `/dashboard` & `/pusat-data` (tanpa JWT valid → redirect `/chatbot`). CC middleware sekarang **14** (dulu 12). Gambar baru sudah ada di `gambar_baru/` | 🔴 |
| 4.2.3 Non-fungsional (Tabel 4.42) | TC-NF-03 "**10–20 detik**"; TC-NF-05 p95 32/27/23 ms | Update TC-NF-03 dengan hasil response time per model; TC-NF-05 dengan uji ulang. Tambah TC-NF baru: fallback model, uji Stop, keamanan statis (npm audit) | 🔴 |
| 4.2.4 RAG (Tabel 4.43) | Eval-1 & Eval-2 | Tambah **Evaluasi 3 (Ragas v3, Okt 2026)**: dataset 10 pertanyaan baru, 5 model, semua metrik + target (DTU 4.2.4). Pertahankan Eval-1/2 sebagai sejarah, dengan catatan bahwa juri, pertanyaan, dan model berbeda | 🔴 |
| 4.2 (subbab baru) | — | Tambah **4.2.5 Audit & Bug yang Diperbaiki** (BUG-01–09, SEC-01) | 🟡 |
| 4.3 Evaluasi Eksternal (SUS 75,97; UEQ-S +1,98) | Hasil dari versi Juni | Tetap valid untuk versi saat itu. Tambah catatan bahwa evaluasi dilakukan **sebelum** versi 7.0, dan masukan responden "meningkatkan kecepatan respons chatbot" sudah ditindaklanjuti (default 19,6 → 4,5 dtk). Opsional: uji SUS/UEQ ulang | ⚪ |

## 6. Lampiran

| Lokasi | Tertulis sekarang | Seharusnya | Prioritas |
|---|---|---|---|
| Lampiran | Link GitHub, rekap testing eksternal | Tambah: cara menjalankan semua pengujian (DTU Lampiran A), daftar variabel lingkungan (nama saja), lokasi laporan di `tests/PPL-II/` | ⚪ |

## 7. Daftar Periksa Sebelum Dikumpulkan

- [ ] Semua 🔴 sudah diperbaiki.
- [ ] Tidak ada lagi kata "Gemini 2.5 Flash" kecuali di bagian sejarah (Ctrl+F).
- [ ] Tidak ada lagi "10–20 detik", "1.500 dokumen", "MySQL", "также" (Ctrl+F).
- [ ] Angka konsisten di seluruh dokumen: 232 unit test, 9 E2E, coverage 85,2% / 75,2%, CC 10,2, 40 endpoint, 8 tabel, 5 model.
- [ ] Semua gambar di plan.md sudah diganti; caption memakai *Insert Caption*; Daftar Gambar & Daftar Tabel di-*Update Field*.
- [ ] Klaim Cloudflare sudah dikonfirmasi ke tim.
- [ ] Target NF-02 (Factual Correctness) ditulis jujur sesuai hasil.
