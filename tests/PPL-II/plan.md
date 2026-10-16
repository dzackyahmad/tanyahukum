# Plan Pembaruan Gambar — Doktek TanyaHukum v7.0

> Pasangan dari [catatan_revisi_doktek.md](catatan_revisi_doktek.md). Berisi daftar **setiap gambar** di `Dokumentasi Teknis PPL1-TanyaHukum-2026.docx` beserta keputusannya: tetap, perbarui, atau baru, dan cara membuatnya.
>
> **Sumber diagram:** file PlantUML di `docs/*.puml`, dirender dengan `node docs/generate-diagrams.mjs` (PNG/SVG ke `docs/output/`). Tangkapan layar diambil dari aplikasi yang berjalan.

## Ringkasan

| Status | Jumlah | Keterangan |
|---|---|---|
| ✅ Tetap | ±111 | Survei, Lofi/Hifi, sebagian besar DFD/flowchart/sequence yang alurnya tidak berubah |
| 🔄 Perbarui | 27 | Isinya sudah tidak sesuai aplikasi sekarang (+ beberapa "🔄 Kecil" yang cukup diedit sedikit) |
| ➕ Baru | 17 (11 wajib, 6 opsional) | Fitur baru yang belum punya gambar |
| 🔢 Nomor salah | 1 | "Gambar 2.24 DFD Level 1" seharusnya 2.52 |

---

## A. Urutan Pengerjaan

1. **Diagram inti** (paling banyak dirujuk teks): ERD (G-01), Arsitektur (G-02), Context (G-03), Use Case (G-05), Deployment (G-19).
2. **Alur chatbot** (perubahan terbesar): DFD-03 (G-08), FC-07 (G-10), SEQ-02 (G-14), Activity Chatbot (G-20).
3. **Diagram baru:** hapus semua riwayat, Stop, personalisasi (G-11, G-12, G-15, G-16).
4. **Tangkapan layar UI** (G-30–G-37): ambil sekaligus dalam satu sesi.
5. **White box CFG:** WB-01 Login, WB-10 Chat, serta modul baru (G-40–G-43).
6. **Penomoran:** pastikan semua caption memakai *References → Insert Caption*, lalu *Update Field* untuk Daftar Gambar.

## B. Cara Membuat Ulang Diagram PlantUML

```powershell
# dari folder tanyahukum/
# 1. Edit blok @startuml <ID> yang sesuai di docs/*.puml
# 2. Render satu file (pakai server PlantUML publik, tanpa install Java)
node docs/generate-diagrams.mjs --file diagrams.puml --format png
# 3. Hasil: docs/output/<folder>/<ID>.png → ganti gambar di Word (klik kanan gambar → Change Picture)
```

**Gaya yang konsisten:**
- Pakai nama model persis seperti di aplikasi: "Gemini 3.5 Flash-Lite", "Gemini 3.6 Flash", "Gemini 3.5 Flash", "GPT-OSS 120B (Groq)", "Qwen 3.8 (Groq)".
- Tabel kuota disebut **PromptUsage**. Jangan menulis "count ChatHistory" untuk kuota lagi.

---

## C. Daftar Gambar BAB II

### C.1 User Research, User Flow, Lofi/Hifi (Gambar 2.1–2.47)

| Gambar | Judul | Status | Catatan |
|---|---|---|---|
| 2.1–2.14 | Grafik survei | ✅ Tetap | Data riset tidak berubah |
| 2.15 | User Flow | 🔄 **G-21** | Tambah cabang: pilih model & mode → kirim → (opsional) Stop/Edit; Profil → Personalisasi; Profil → Akun → hapus riwayat / dokumen legal. Sumber gambar asli: Figma/draw.io tim |
| 2.16–2.31 | Lofi | ✅ Tetap | Artefak desain awal |
| 2.32–2.35, 2.38–2.47 | Hifi | ✅ Tetap | — |
| 2.36 | Hifi Profile | ✅ Tetap / opsional ➕ | Implementasi sekarang berupa modal 5 tab. Opsional: tambah "Hifi Profile v2" di Figma |
| 2.37 | Hifi Chatbot | ✅ Tetap / opsional ➕ | Opsional: "Hifi Chatbot v2" dengan pemilih model, panel Proses, tombol Stop |

### C.2 Diagram Rancangan Fungsional (Gambar 2.48–2.102)

| ID | Gambar | Judul | Sumber (`docs/*.puml` → ID) | Status | Yang harus diubah |
|---|---|---|---|---|---|
| G-02 | 2.48 | Arsitektur Sistem | `diagrams.puml` → `ARCH` | 🔄 | Kotak "Google Gemini 2.5 Flash" → **"LLM Providers"** berisi Gemini 3.5 Flash-Lite, 3.6 Flash, 3.5 Flash (Gemini API) + GPT-OSS 120B, Qwen 3.8 (Groq API). Tambah alur **fallback** (panah putus-putus ke model cadangan), **streaming NDJSON** (API → Client), **PromptUsage** di DB, Gmail SMTP, Supabase Storage. Panah `CHAT → GEMINI : llm.invoke` → `llm.stream` |
| G-03 | 2.49 | Context Diagram | `diagrams.puml` → `CONTEXT` | 🔄 | Ganti "Google Gemini 2.5 Flash". Tambah entitas **Groq API**, **Voyage AI**, **Pinecone**, **Gmail SMTP**. Arus data baru: pengguna → sistem (`mode`, `preferences`, Stop); sistem → pengguna (stream jawaban + proses) |
| G-05 | 2.50 | Use Case Diagram | `diagrams.puml` → `USECASE` | 🔄 | **Use case baru** (Free & PRO User): Pilih Model & Mode; Lihat Proses Jawaban; Hentikan Jawaban (Stop); Edit Pertanyaan yang Dihentikan; Salin Pesan; Buka Sumber Sitasi; Atur Personalisasi Gaya Jawaban; Hapus Semua Riwayat Chat; Baca Kebijakan Privasi; Baca Syarat & Ketentuan (Guest juga bisa membaca dokumen legal). Relasi: «include» Cek Kuota Harian pada "Ajukan Pertanyaan"; «extend» Fallback Model. Ubah keterangan PRO menjadi "tanpa batas harian". Setelah itu update angka "27 use case" di teks |
| G-06 | 2.51 | DFD Level 0 | `dfd.puml` → `DFD-00-Context` | 🔄 | Sama dengan G-03: "Gemini 2.5 Flash" → LLM providers (Gemini + Groq). Tambah Voyage/Pinecone bila belum ada |
| G-07 | **2.24 → 2.52** | DFD Level 1 | `dfd.puml` → `DFD-01-Level1` | 🔄 + 🔢 | **Perbaiki nomor caption** (gambar sesudahnya ikut bergeser +1). Kotak "VoyageAI + Pinecone + Gemini LLM" → "VoyageAI + Pinecone + LLM (Gemini/Groq)". Tambah data store **DS PromptUsage**; proses chat membaca kuota dari PromptUsage, bukan dari ChatHistory |
| — | 2.52 | DFD L2 Autentikasi | `DFD-02-Auth` | ✅ Tetap | Alur sama (perbaikan password ter-trim tidak mengubah DFD) |
| G-08 | 2.53 | DFD L2 Chatbot AI | `dfd.puml` → `DFD-03-ChatRAG` | 🔄 **Besar** | Proses baru: 3.1 Verifikasi sesi, **rate limit**, kuota (**DS PromptUsage**, bukan "count chat hari ini" dari DS_HIST); 3.2 Embedding (+ **cache**); 3.3 Retrieval topK 50 + **penyaring noise**; 3.4 Susun prompt (+ **personalContext**, **preferences**); 3.5 **Pilih model sesuai `mode`** → Gemini / Groq, **fallback**; 3.6 **Stream** ke pengguna (step, sources, model, thinking, text, done); 3.7 Simpan Chat + ChatHistory + **PromptUsage**. Hapus label "Gemini 2.5 Flash (LLM, temp 0.2)" |
| G-09 | 2.54 | DFD L2 Pusat Data | `DFD-04-Regulations` | 🔄 Kecil | Tambah proses **Resolve Sitasi** (`GET /api/regulations/resolve`): judul sitasi dari jawaban AI → id & fileUrl regulasi |
| — | 2.55 | DFD L2 Payment | `DFD-05-Payment` | ✅ Tetap | — |
| G-22 | 2.56 | DFD L2 Profile | `DFD-06-Profile` | 🔄 | Tambah **Hapus Semua Riwayat** (→ DS Chat/ChatHistory, PromptUsage tidak dihapus). Hapus akun ikut menghapus **PromptUsage** (cascade). Catat bahwa preferensi gaya jawaban disimpan di browser, bukan di DS |
| G-23 | 2.57 | DFD L2 Admin | `DFD-07-Admin` | 🔄 Kecil | Daftar pengguna: sisa kuota dihitung dari **PromptUsage** hari ini |
| G-24 | 2.58 | Flowchart Overview | `flowchart.puml` → `FC-00-SystemOverview` | 🔄 | Tambah cabang menu: Personalisasi, Akun (hapus riwayat, dokumen legal), halaman Kebijakan Privasi / S&K |
| — | 2.59 | FC Registrasi | `FC-01-Register` | ✅ Tetap | — |
| G-25 | 2.60 | FC Login Email | `FC-02-Login` | 🔄 Kecil | Setelah "password cocok?" = Tidak → cabang "password diawali/diakhiri spasi?" → bandingkan versi ter-trim. Tambah rate limit per email (10/menit) |
| — | 2.61–2.63 | FC Google, Forgot/Reset, Logout | `FC-03`…`FC-05` | ✅ Tetap | — |
| G-44 | 2.64 | FC Middleware | `flowchart.puml` → `FC-06-Middleware` | 🔄 (17 Okt) | Tambah CSRF, guard `/admin`, guard baru `/dashboard` & `/pusat-data` → redirect `/chatbot` (BUG-08) |
| G-10 | 2.65 | FC Chatbot RAG | `flowchart.puml` → `FC-07-ChatRAG` | 🔄 **Besar** | Alur baru: login? → rate limit? → kuota FREE (**PromptUsage**)? → embedding (cache?) → Pinecone topK 50 → saring noise → susun prompt (+preferensi) → **loop model** [panggil model sesuai `mode` → error sebelum menulis & ada cadangan? → model berikutnya] → stream teks → **Stop ditekan?** (Ya: batalkan, catat PromptUsage bila sudah menulis, tidak simpan riwayat) → simpan Chat/ChatHistory/PromptUsage → `done` |
| G-26 | 2.66 | FC Manajemen Profil | `FC-08-Profile` | 🔄 | Tambah tab Personalisasi (simpan preferensi ke localStorage) dan tab Akun (dokumen legal → tab baru; hapus riwayat → konfirmasi 2 langkah) |
| — | 2.67–2.71 | FC Avatar, Pusat Data, Download, Upgrade PRO, Dashboard | `FC-09`…`FC-13` | ✅ Tetap | — |
| G-27 | 2.72 | FC Admin Panel | `FC-14-Admin` | ✅ / 🔄 Kecil | Hanya jika menampilkan perhitungan sisa kuota → PromptUsage |
| G-28 | 2.73 | SEQ Login Email | `diagrams.puml` → `SEQ-01-Login` | 🔄 Kecil | Tambah rate limit per email dan perbandingan ulang password ter-trim |
| G-14 | 2.74 | SEQ Chatbot RAG | `diagrams.puml` → `SEQ-02-ChatRAG` | 🔄 **Besar** | Partisipan: User, ChatArea, API `/api/chat`, Prisma (User, PromptUsage, Chat, ChatHistory), Voyage, Pinecone, **Gemini API**, **Groq API**. Pesan: POST `{message, mode, preferences, stream:true}` → baca DB paralel → embed (cache) → query topK 50 → `stream` ke model; **alt** gagal sebelum menulis → model cadangan; **loop** event NDJSON (`step`, `sources`, `model`, `thinking`, `text`) → `done`; **opt** Stop → abort, tidak disimpan |
| — | 2.75–2.78 | SEQ Google, Payment, Reset, Admin Upload | `SEQ-03`…`SEQ-06` | ✅ Tetap | — |
| — | 2.79–2.80 | SEQ Registrasi, Logout | `SEQ-07`, `SEQ-08` | ✅ Tetap | — |
| — | 2.81–2.82 | SEQ Lihat/Update Profil | `SEQ-09`, `SEQ-10` | ✅ Tetap | (konteks personal sudah ada) |
| G-29 | 2.83 | SEQ Hapus Akun | `sequences.puml` → `SEQ-11-DeleteProfile` | 🔄 Kecil | Cascade juga menghapus **PromptUsage** |
| — | 2.84–2.86 | SEQ Avatar, Ambil Riwayat, Rename | `SEQ-12`…`SEQ-14` | ✅ Tetap | — |
| G-38 | 2.87 | SEQ Hapus Chat | `SEQ-15-DeleteChat` | 🔄 Kecil | Tambah catatan: PromptUsage **tidak** ikut terhapus (kuota tidak kembali) |
| — | 2.88–2.91 | SEQ Cari Regulasi, Detail, Download, Dashboard | `SEQ-16`…`SEQ-19` | ✅ Tetap | — |
| G-39 | 2.92 | SEQ Admin Pengguna | `SEQ-20-AdminUsers` | 🔄 Kecil | Sisa kuota = promptLimit − PromptUsage hari ini |
| — | 2.93–2.95 | SEQ Admin Regulasi, Isu, Dashboard | `SEQ-21`…`SEQ-23` | ✅ Tetap | — |
| G-19 | 2.96 | Deployment Diagram | `deployment.puml` → `DEPLOYMENT` | 🔄 | Node baru: **Groq Cloud** (GPT-OSS, Qwen), Gmail SMTP; Gemini API berisi 3 model (bukan 2.5 Flash); label koneksi `stream (NDJSON)`; Supabase Storage (bucket `avatars`, `legal-documents`); Cloudflare R2 (file dokumen) bila dikonfirmasi |
| — | 2.97 | Activity Autentikasi | (bukan PlantUML: cari file sumber tim) | ✅ Tetap | — |
| G-20 | 2.98 | Activity Chatbot | (bukan PlantUML) | 🔄 | Swimlane Pengguna: pilih model & mode → ketik → (opsional) Stop/Edit. Swimlane Sistem: cek kuota → retrieval → model (fallback) → stream → simpan. Bisa dibuat ulang di PlantUML (activity) agar seragam |
| — | 2.99–2.101 | Activity Payment, Pusat Data, Dashboard | (bukan PlantUML) | ✅ Tetap | — |
| G-01 | 2.102 | ERD | `diagrams.puml` → `ERD` | 🔄 | Tambah entitas **PromptUsage** (`id` PK, `userId` FK, `createdAt`; indeks `userId, createdAt`), relasi User 1–* PromptUsage. Tandai **ON DELETE CASCADE** untuk Chat, ChatHistory, Transaction, dan PromptUsage. SearchLog.userId dan TrendingIssue.createdBy **opsional** (0..*) |

### C.3 Diagram Baru BAB II (sisipkan di subbab yang sesuai)

| ID | Usulan judul | Sisipkan setelah | Sumber | Wajib? | Isi |
|---|---|---|---|---|---|
| G-11 | Flowchart Hapus Semua Riwayat Chat | 2.66 (FC Profil) | `flowchart.puml` → blok baru `FC-15-DeleteAllHistory` | Wajib | Klik "Hapus riwayat" → dialog langkah 1 → Lanjutkan → ketik HAPUS → valid? → `DELETE /api/chat/history` → rate limit 3/menit → hapus Chat (cascade ChatHistory) → tampilkan jumlah terhapus |
| G-12 | Flowchart Stop & Edit Pertanyaan | 2.65 (FC Chatbot) | blok baru `FC-16-StopEdit` | Wajib | AI menulis → Stop → abort stream → jawaban sebagian tampil (tidak disimpan) → tombol Edit → ubah teks → kirim ulang |
| G-13 | Flowchart Personalisasi Gaya Jawaban | setelah G-11 | blok baru `FC-17-Preferences` | Opsional | Pilih opsi → simpan ke localStorage → dikirim di setiap pertanyaan → server whitelist → disisipkan ke prompt |
| G-15 | Sequence Hapus Semua Riwayat | 2.87 | `sequences.puml` → blok baru `SEQ-24-DeleteAllHistory` | Wajib | User → ProfileModal → API `DELETE /api/chat/history {confirm}` → getSession → rateLimit → `prisma.chat.deleteMany` → `{deletedChats}` |
| G-16 | Sequence Stop Jawaban | setelah G-14 | blok baru `SEQ-25-StopStream` | Wajib | ChatArea `AbortController.abort()` → stream `cancel()` → abort ke LLM → (opt) `promptUsage.create` → tidak ada `chatHistory.create` |
| G-17 | Sequence Resolve Sitasi | 2.89 | blok baru `SEQ-26-ResolveCitation` | Opsional | Jawaban selesai → `GET /api/regulations/resolve?title=…` → tautan sitasi |
| G-18 | Diagram Pemilihan Model & Fallback | 2.7.1 atau 2.7.14 | `diagrams.puml` → blok baru `MODEL-ROUTING` | Opsional | `mode` → MODE_CONFIG (10 mode) → rantai model [pilihan → Gemini cadangan]; Groq dilewati jika tanpa key; konteks Groq 20 potongan |

---

## D. Daftar Gambar BAB III (Tangkapan Layar)

**Cara mengambil:**
- Jalankan aplikasi dengan build produksi (`npm run build && npm start`), supaya indikator "N" dev Next.js tidak ikut terfoto.
- Login dengan akun uji yang berisi data dummy rapi (tanpa data pribadi).
- Resolusi 1366×768 atau 1440×900, mode terang (mode gelap opsional untuk satu gambar).
- Simpan PNG di `docs/output/screenshots/` agar mudah dicari.

| ID | Gambar | Judul | Status | Yang harus tampak |
|---|---|---|---|---|
| — | 3.1–3.3 | Login, Register, Reset Password | ✅ Tetap | — |
| G-31 | 3.4 | User Profile Page | 🔄 | Modal **Pengaturan** tab **Profile** (5 tab di kiri). Ganti teks "app/profile/page.js" dengan `ProfileModal.jsx` |
| G-30 | 3.5 | Chatbot Page | 🔄 | Percakapan berisi jawaban dengan **sitasi**, **panel Proses** terbuka (tahap, dokumen, model, waktu), tombol Salin, pemilih model "3.5 Flash-Lite · Kilat" di kotak input |
| — | 3.6–3.9 | Dashboard, Database Hukum, Subscription, Payment | ✅ Tetap | Ambil ulang hanya jika tampilannya berubah |
| — | 3.10–3.15 | Halaman Admin & pop-up | ✅ Tetap | — |
| G-32 | baru (3.6) | Pemilih Model & Mode | ➕ Wajib | Menu terbuka: 5 model di atas, Kilat/Berpikir di bawah |
| G-33 | baru | Panel Proses & Mode Berpikir | ➕ Opsional | Jawaban mode Berpikir dengan ringkasan proses berpikir terlihat |
| G-34 | baru | Stop & Edit Pertanyaan | ➕ Wajib | Pesan berlabel "Dihentikan · tidak disimpan" dengan tombol Salin dan Edit |
| G-35 | baru | Personalisasi AI | ➕ Wajib | Tab Personalisasi: 7 dropdown + "Tentang Anda" |
| G-36b | baru | Profil › Akun | ➕ Wajib | Daftar Dokumen legal + Data dan akun |
| G-37 | baru | Konfirmasi Hapus Riwayat | ➕ Opsional | Dialog "Langkah 2 dari 2" dengan input HAPUS |
| G-37b | baru | Kebijakan Privasi | ➕ Wajib | `/privacy-policy`: header ID/EN, daftar isi, ringkasan |
| G-37c | baru | Syarat dan Ketentuan + FAQ | ➕ Wajib | `/terms-of-service?lang=en` dengan satu FAQ terbuka |
| G-36 | 3.16 | Struktur Database | 🔄 | Diagram fisik dengan tabel **PromptUsage** (bisa ekspor dari Supabase Table Editor / dbdiagram, atau ERD G-01 versi kolom lengkap) |

> Penomoran: gambar baru BAB III disisipkan setelah 3.5 (Chatbot) dan 3.4 (Profil), sehingga nomor sesudahnya bergeser. Pakai *Insert Caption* agar otomatis.

---

## E. Daftar Gambar BAB IV (Control Flow Diagram White Box)

Sumber: `docs/whitebox.puml`.

| ID | Gambar | Modul | Sumber | Status | Yang harus diubah |
|---|---|---|---|---|---|
| G-40 | 4.1 | WB-01 Login | `WB-01-Login` | 🔄 | Node baru: rate limit per email; cabang perbandingan ulang password ter-trim. Hitung ulang CC & basis path (ESLint: CC 16) |
| — | 4.2–4.9 | WB-02 s.d. WB-09 | `WB-02`…`WB-09` | ✅ Tetap* | *Cek ulang CC dengan ESLint; kode tidak berubah fungsi |
| G-41 | 4.10 | WB-10 POST /api/chat | `WB-10-PostChat` | 🔄 **Besar** | Buat ulang dari kode sekarang: sesi → JSON → message → rate limit → chatId → baca DB paralel → kepemilikan → user → **kuota PromptUsage** → `stream?` (cabang JSON vs stream) → loop model + fallback → simpan. CC handler 25, fungsi stream 25. Disarankan membuat 2 CFG terpisah: handler `POST` dan `streamChatResponse.start` |
| — | 4.11–4.19 | WB-11 s.d. WB-19 | `WB-11`…`WB-19` | ✅ Tetap* | *Sama dengan di atas |
| G-45 | 4.20 | WB-20 middleware.js | `WB-20-Middleware` | 🔄 (17 Okt) | Tambah cabang CSRF, guard `/admin`, guard `/dashboard` & `/pusat-data`. CC terukur 14 |
| G-42 | baru 4.21 | WB-21 DELETE /api/chat/history | blok baru `WB-21-DeleteAllHistory` | ➕ Wajib | 5 cabang: sesi, rate limit, JSON, konfirmasi, sukses/500 |
| G-43 | baru 4.22 | WB-22 lib/rateLimit.js | blok baru `WB-22-RateLimit` | ➕ Opsional | Cabang `current >= max` + catatan perbaikan `noUpdateTTL` (BUG-01) |

---

## F. Tabel yang Ikut Berubah (bukan gambar, tetapi sering lupa)

| Tabel | Perubahan | Sumber isi |
|---|---|---|
| 1.1 Sejarah Perbaikan | + versi 7.0 | catatan_revisi §1 |
| 1.2 Singkatan | + 11 singkatan | DTU 1.4 |
| 2.4 Data Requirement | + D009, D010 | DTU 2.7.9 |
| 2.7 Chat API, 2.8 Regulation API | + API-31, API-32; perbaiki nama API-11 & API-17 | DTU 2.7.11 |
| 2.12 Kebutuhan Fungsional | + KF baru | DTU 2.7.12 |
| 2.13 Kebutuhan Non-Fungsional | Revisi NF-01, NF-02 (jujur soal Factual Correctness), NF-06 | catatan_revisi §3 |
| 4.3, 4.19, 4.20 Black box | Hasil terbaru (232 + 9 E2E) | DTU 4.2.1, `PENGUJIAN_BLACKBOX.md` |
| 4.21 Rekap white box | Tambah kolom coverage terukur & CC ESLint | DTU 4.2.2, `PENGUJIAN_WHITEBOX.md` |
| 4.42 Non-fungsional | Response time per model, fallback, Stop | DTU 4.2.3, `EVALUASI_RESPONSE_TIME.md` |
| 4.43 RAG | + kolom/tabel Evaluasi 3 (5 model) | DTU 4.2.4, `EVALUASI_RAGAS_V3.md` |
| baru 4.x | Bug yang diperbaiki | DTU 4.2.5 |

## G. Checklist Akhir

- [ ] 27 gambar 🔄 sudah diganti: User Flow, Arsitektur, Context, Use Case, DFD-00/01/03/04/06/07, FC-00/02/07/08, SEQ-01/02/11/15/20, Deployment, Activity Chatbot, ERD, screenshot Profil & Chatbot, Struktur DB, CFG WB-01 & WB-10.
- [ ] 11 gambar ➕ wajib sudah ditambahkan: G-11, G-12, G-15, G-16 (diagram), G-32, G-34, G-35, G-36b, G-37b, G-37c (screenshot), G-42 (CFG). Opsional: G-13, G-17, G-18, G-33, G-37, G-43.
- [ ] Caption "Gambar 2.24 DFD Level 1" diperbaiki; semua caption memakai *Insert Caption*.
- [ ] Teks yang merujuk nomor gambar ("lihat Gambar 2.xx") memakai *Cross-reference* agar ikut berubah.
- [ ] Daftar Gambar & Daftar Tabel di-*Update Field*.
- [ ] Ctrl+F "2.5 Flash", "Gemini AI" (sebagai satu-satunya LLM), "count chat" → tidak tersisa di diagram baru.
