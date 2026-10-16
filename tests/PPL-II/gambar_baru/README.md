# Gambar Baru — Doktek TanyaHukum v7.0

Hasil kerja sesuai [plan.md](../plan.md) dan [catatan_revisi_doktek.md](../catatan_revisi_doktek.md).
File asli di `docs/*.puml` **tidak diubah** — semua di sini adalah salinan yang diedit di `src/`.
Kode aplikasi dipakai sebagai sumber kebenaran tertinggi; perbedaan dengan `plan.md` dicatat di kolom **Catatan**.

- `src/` — salinan `.puml` yang sudah diedit/ditambah (6 file: `diagrams`, `sequences`, `dfd`, `flowchart`, `whitebox`, `deployment`)
- `png/`, `svg/` — hasil render (82 diagram × 2 format = 164 file)
- `screenshots/` — 10 tangkapan layar UI (akun uji `test@mail.com`)
- `generate.mjs` — render PlantUML via server publik (salinan `docs/generate-diagrams.mjs`, baca `src/` tulis ke `png/`/`svg/`)

## A. Diagram PlantUML (82)

| ID | Judul | Gambar di Doktek | File | Status | Catatan |
|---|---|---|---|---|---|
| ERD | Entity Relationship Diagram | 2.102 (G-01) | `ERD.png/svg` | 🔄 Diperbarui | + entitas PromptUsage, relasi User 1–*; cascade dicatat hanya untuk FK yang terkonfirmasi di migration.sql (Chat, ChatHistory, Transaction, PromptUsage) |
| ARCH | Arsitektur Sistem | 2.48 (G-02) | `ARCH.png/svg` | 🔄 Diperbarui | "Google Gemini 2.5 Flash" → paket LLM Providers (Gemini 3 model + Groq 2 model), fallback, `llm.stream` |
| CONTEXT | Context Diagram | 2.49 (G-03) | `CONTEXT.png/svg` | 🔄 Diperbarui | Entitas Gemini API & Groq API terpisah; arus data mode/preferences/Stop |
| USECASE | Use Case Diagram | 2.50 (G-05) | `USECASE.png/svg` | 🔄 Diperbarui | 27 → 36 use case (UC-28..UC-36 baru) |
| DFD-00-Context | DFD Level 0 | 2.51 (G-06) | `DFD-00-Context.png/svg` | 🔄 Diperbarui | sama seperti CONTEXT |
| DFD-01-Level1 | DFD Level 1 | 2.24→2.52 (G-07) | `DFD-01-Level1.png/svg` | 🔄 + 🔢 nomor | + DS7 PromptUsage; caption lama bentrok nomor dengan gambar lain (lihat catatan_revisi) |
| DFD-02-Auth | DFD L2 Autentikasi | 2.52 | `DFD-02-Auth.png/svg` | ✅ Tetap | dirender ulang saja (tidak diedit) |
| DFD-03-ChatRAG | DFD L2 Chatbot AI | 2.53 (G-08) | `DFD-03-ChatRAG.png/svg` | 🔄 Besar | ditulis ulang: rate limit, kuota PromptUsage, cache embedding, saring noise, fallback, stream, simpan |
| DFD-04-Regulations | DFD L2 Pusat Data | 2.54 (G-09) | `DFD-04-Regulations.png/svg` | 🔄 Kecil | + proses 4.5 Resolve Sitasi AI |
| DFD-05-Payment | DFD L2 Payment | 2.55 | `DFD-05-Payment.png/svg` | ✅ Tetap | — |
| DFD-06-Profile | DFD L2 Profile | 2.56 (G-22) | `DFD-06-Profile.png/svg` | 🔄 Diperbarui | + 2.5 Hapus Semua Riwayat, 2.6 Personalisasi (client-only, catatan: TIDAK disimpan di DB) |
| DFD-07-Admin | DFD L2 Admin | 2.57 (G-23) | `DFD-07-Admin.png/svg` | 🔄 Kecil | kuota dari DS7 PromptUsage, bukan ChatHistory (BUG-06) |
| FC-00-SystemOverview | Flowchart Overview | 2.58 (G-24) | `FC-00-SystemOverview.png/svg` | 🔄 Diperbarui | + cabang Personalisasi, Akun, halaman legal |
| FC-01-Register | FC Registrasi | 2.59 | `FC-01-Register.png/svg` | ✅ Tetap | — |
| FC-02-Login | FC Login Email | 2.60 (G-25) | `FC-02-Login.png/svg` | 🔄 Kecil | + rate limit per email, retry bcrypt ter-trim (BUG-07) |
| FC-03-GoogleOAuth | FC Google OAuth | 2.61 | `FC-03-GoogleOAuth.png/svg` | ✅ Tetap | — |
| FC-04-ForgotResetPassword | FC Forgot/Reset Password | 2.62 | `FC-04-ForgotResetPassword.png/svg` | ✅ Tetap | — |
| FC-05-Logout | FC Logout | 2.63 | `FC-05-Logout.png/svg` | ✅ Tetap | — |
| FC-06-Middleware | FC Middleware | 2.64 | `FC-06-Middleware.png/svg` | 🔄 Diperbarui (17 Okt) | + CSRF, guard halaman `/admin`, guard baru `/dashboard` & `/pusat-data` → redirect `/chatbot` (BUG-08) |
| FC-07-ChatRAG | FC Chatbot RAG | 2.65 (G-10) | `FC-07-ChatRAG.png/svg` | 🔄 Besar | ditulis ulang untuk mode streaming: quota guard, loop model + fallback, cabang Stop |
| FC-08-Profile | FC Manajemen Profil | 2.66 (G-26) | `FC-08-Profile.png/svg` | 🔄 Diperbarui | + partisi Personalisasi & Akun (Dokumen Legal, Hapus Riwayat) |
| FC-09-UploadAvatar | FC Upload Avatar | 2.67 | `FC-09-UploadAvatar.png/svg` | ✅ Tetap | — |
| FC-10-Regulations | FC Pusat Data Hukum | 2.68 | `FC-10-Regulations.png/svg` | ✅ Tetap | — |
| FC-11-Download | FC Download PDF | 2.69 | `FC-11-Download.png/svg` | ✅ Tetap | — |
| FC-12-Payment | FC Upgrade PRO | 2.70 | `FC-12-Payment.png/svg` | ✅ Tetap | — |
| FC-13-Dashboard | FC Dashboard | 2.71 | `FC-13-Dashboard.png/svg` | ✅ Tetap | — |
| FC-14-Admin | FC Admin Panel | 2.72 (G-27) | `FC-14-Admin.png/svg` | ✅ Tetap | tidak menampilkan hitungan kuota secara eksplisit di flowchart ini |
| SEQ-01-Login | SEQ Login Email | 2.73 (G-28) | `SEQ-01-Login.png/svg` | 🔄 Kecil | + rate limit per email, retry bcrypt ter-trim |
| SEQ-02-ChatRAG | SEQ Chatbot RAG | 2.74 (G-14) | `SEQ-02-ChatRAG.png/svg` | 🔄 Besar | ditulis ulang total: Gemini API/Groq API, alt fallback, loop NDJSON, opt Stop |
| SEQ-03-GoogleOAuth | SEQ Google OAuth | 2.75 | `SEQ-03-GoogleOAuth.png/svg` | ✅ Tetap | — |
| SEQ-04-Payment | SEQ Payment | 2.76 | `SEQ-04-Payment.png/svg` | ✅ Tetap | — |
| SEQ-05-ResetPassword | SEQ Reset Password | 2.77 | `SEQ-05-ResetPassword.png/svg` | ✅ Tetap | — |
| SEQ-06-AdminUpload | SEQ Admin Upload | 2.78 | `SEQ-06-AdminUpload.png/svg` | ✅ Tetap | — |
| SEQ-07-Register | SEQ Registrasi | 2.79 | `SEQ-07-Register.png/svg` | ✅ Tetap | — |
| SEQ-08-Logout | SEQ Logout | 2.80 | `SEQ-08-Logout.png/svg` | ✅ Tetap | — |
| SEQ-09-GetProfile | SEQ Lihat Profil | 2.81 | `SEQ-09-GetProfile.png/svg` | ✅ Tetap | — |
| SEQ-10-UpdateProfile | SEQ Update Profil | 2.82 | `SEQ-10-UpdateProfile.png/svg` | ✅ Tetap | — |
| SEQ-11-DeleteProfile | SEQ Hapus Akun | 2.83 (G-29) | `SEQ-11-DeleteProfile.png/svg` | 🔄 Kecil | cascade + PromptUsage; SearchLog/TrendingIssue dicatat opsional (nullable), bukan cascade |
| SEQ-12-UploadAvatar | SEQ Upload Avatar | 2.84 | `SEQ-12-UploadAvatar.png/svg` | ✅ Tetap | — |
| SEQ-13-GetChat | SEQ Ambil Riwayat | 2.85 | `SEQ-13-GetChat.png/svg` | ✅ Tetap | — |
| SEQ-14-RenameChat | SEQ Rename Chat | 2.86 | `SEQ-14-RenameChat.png/svg` | ✅ Tetap | — |
| SEQ-15-DeleteChat | SEQ Hapus Chat | 2.87 (G-38) | `SEQ-15-DeleteChat.png/svg` | 🔄 Kecil | + catatan PromptUsage tidak ikut terhapus |
| SEQ-16-GetRegulations | SEQ Cari Regulasi | 2.88 | `SEQ-16-GetRegulations.png/svg` | ✅ Tetap | — |
| SEQ-17-RegulationDetail | SEQ Detail Regulasi | 2.89 | `SEQ-17-RegulationDetail.png/svg` | ✅ Tetap | — |
| SEQ-18-DownloadPDF | SEQ Download PDF | 2.90 | `SEQ-18-DownloadPDF.png/svg` | ✅ Tetap | — |
| SEQ-19-Dashboard | SEQ Dashboard | 2.91 | `SEQ-19-Dashboard.png/svg` | ✅ Tetap | — |
| SEQ-20-AdminUsers | SEQ Admin Pengguna | 2.92 (G-39) | `SEQ-20-AdminUsers.png/svg` | 🔄 Kecil | `_count messages` → `_count promptUsages` (BUG-06) |
| SEQ-21-AdminRegulations | SEQ Admin Regulasi | 2.93 | `SEQ-21-AdminRegulations.png/svg` | ✅ Tetap | — |
| SEQ-22-AdminTrending | SEQ Admin Isu Trending | 2.94 | `SEQ-22-AdminTrending.png/svg` | ✅ Tetap | — |
| SEQ-23-AdminDashboard | SEQ Admin Dashboard | 2.95 | `SEQ-23-AdminDashboard.png/svg` | ✅ Tetap | — |
| DEPLOYMENT | Deployment Diagram | 2.96 (G-19) | `DEPLOYMENT.png/svg` | 🔄 Diperbarui | + node Groq Cloud, Gemini 3 model, label `llm.stream` |
| ACT-01-ChatbotActivity | Activity Chatbot (swimlane) | 2.98 (G-20) | `ACT-01-ChatbotActivity.png/svg` | ➕ Baru | versi PlantUML pengganti diagram non-PlantUML tim, sesuai instruksi kerja #2 |
| ACT-02-UserFlow | User Flow (swimlane) | 2.15 (G-21) | `ACT-02-UserFlow.png/svg` | ➕ Baru | versi PlantUML pengganti diagram Figma/draw.io tim, sesuai instruksi kerja #2 |
| SEQ-24-DeleteAllHistory | SEQ Hapus Semua Riwayat | baru (G-15) | `SEQ-24-DeleteAllHistory.png/svg` | ➕ Baru wajib | — |
| SEQ-25-StopStream | SEQ Stop Jawaban | baru (G-16) | `SEQ-25-StopStream.png/svg` | ➕ Baru wajib | — |
| SEQ-26-ResolveCitation | SEQ Resolve Sitasi | baru (G-17) | `SEQ-26-ResolveCitation.png/svg` | ➕ Baru opsional | — |
| FC-15-DeleteAllHistory | FC Hapus Semua Riwayat | baru (G-11) | `FC-15-DeleteAllHistory.png/svg` | ➕ Baru wajib | — |
| FC-16-StopEdit | FC Stop & Edit Pertanyaan | baru (G-12) | `FC-16-StopEdit.png/svg` | ➕ Baru wajib | — |
| FC-17-Preferences | FC Personalisasi | baru (G-13) | `FC-17-Preferences.png/svg` | ➕ Baru opsional | — |
| WB-01-Login | CFG POST /api/auth/login | 4.1 (G-40) | `WB-01-Login.png/svg` | 🔄 Diperbarui | **CC=19 terukur** (ESLint, `PENGUJIAN_WHITEBOX.md`) — plan.md memperkirakan 16, kode riil lebih kompleks (2 cabang baru: rate limit per-email, retry trim) |
| WB-02-Register s.d. WB-09-DeleteProfile | CFG modul lain | 4.2–4.9 | `WB-02..09*.png/svg` | ✅ Tetap* | dirender ulang untuk perbaikan sintaks warna saja, logika tidak berubah |
| WB-10-PostChat | CFG POST /api/chat (handler utama) | 4.10 (G-41a) | `WB-10-PostChat.png/svg` | 🔄 Besar, dipecah 2 | **CC=25 terukur**; dipecah sesuai saran plan.md sendiri |
| WB-10b-StreamChatResponse | CFG streamChatResponse (streaming) | 4.10b (G-41b) | `WB-10b-StreamChatResponse.png/svg` | ➕ Baru (pecahan WB-10) | **CC=25 terukur**, loop model, fallback, Stop, save |
| WB-11-GetChat s.d. WB-19-Webhook | CFG modul lain | 4.11–4.19 | `WB-11..19*.png/svg` | ✅ Tetap* | sama seperti WB-02..09 |
| WB-20-Middleware | CFG middleware.js | 4.20 | `WB-20-Middleware.png/svg` | 🔄 Diperbarui (17 Okt) | **CC=14 terukur** (dulu 6 di doktek, 12 di Okt); + CSRF, guard `/admin`, guard baru `/dashboard` & `/pusat-data` (BUG-08) |
| WB-21-DeleteAllHistory | CFG DELETE /api/chat/history | baru 4.21 (G-42) | `WB-21-DeleteAllHistory.png/svg` | ➕ Baru wajib | **CC=8 terukur** (plan.md tidak memberi angka) |
| WB-22-RateLimit | CFG lib/rateLimit.js | baru 4.22 (G-43) | `WB-22-RateLimit.png/svg` | ➕ Baru opsional | ilustrasi perbaikan BUG-01 (`noUpdateTTL`) |

> **Perbaikan tambahan di luar rencana:** seluruh 23 diagram di `whitebox.puml` (termasuk 19 yang tidak diedit logikanya) memakai syntax pewarnaan lama `#COLOR:text;` yang sudah *deprecated* di server PlantUML publik saat ini (`1.2026.9beta4`) — menyebabkan banner peringatan kuning dan warna hilang di SEMUA diagram CFG, termasuk yang ada di `docs/whitebox.puml` asli bila dirender ulang hari ini. Diperbaiki secara global (103 kemunculan) menjadi syntax baru `:text; <<#COLOR>>`. Ini bukan bagian dari `plan.md`, ditemukan saat debug render.

## B. Tangkapan Layar UI (10)

| ID | Judul | Gambar di Doktek | File | Status | Catatan |
|---|---|---|---|---|---|
| G-31 | Profil — tab Profile | 3.4 | `G-31_profil.png` | 🔄 Diperbarui | Modal Pengaturan 5 tab (bukan halaman terpisah) |
| G-30 | Chatbot — jawaban + panel Proses | 3.5 | `G-30_chatbot-proses-panel.png` | 🔄 Diperbarui | Jawaban live mode Qwen 3.8 Kilat, sitasi [1][2][3], panel Proses terbuka |
| G-32 | Pemilih Model & Mode | baru (3.6) | `G-32_pemilih-model.png` | ➕ Baru wajib | Menu terbuka: 5 model, Kilat/Berpikir |
| G-33 | Panel Proses & Mode Berpikir | baru | `G-33_mode-berpikir.png` | ➕ Baru opsional | Jawaban live mode Qwen 3.8 Berpikir, ringkasan "Lihat proses berpikir AI" terlihat |
| G-34 | Stop & Edit Pertanyaan | baru | `G-34_stop-edit-pertanyaan.png` | ➕ Baru wajib | Label "Dihentikan · tidak disimpan" + tombol Salin/Edit; "Belum ada obrolan" di riwayat (konfirmasi tidak tersimpan) |
| G-35 | Profil > Personalisasi | baru | `G-35_personalisasi.png` | ➕ Baru wajib | 7 dropdown preferensi gaya jawaban |
| G-36b | Profil > Akun | baru | `G-36b_akun.png` | ➕ Baru wajib | Dokumen Legal + Data dan Akun |
| G-37 | Konfirmasi Hapus Riwayat (langkah 2) | baru | `G-37_konfirmasi-hapus-riwayat.png` | ➕ Baru opsional | Dialog ketik "HAPUS"; dibatalkan (Escape) setelah screenshot, riwayat akun uji tidak dihapus |
| G-37b | Kebijakan Privasi | baru | `G-37b_kebijakan-privasi.png` | ➕ Baru wajib | `/privacy-policy` |
| G-37c | Syarat & Ketentuan (EN) + FAQ | baru | `G-37c_terms-of-service-en.png` | ➕ Baru wajib | `/terms-of-service?lang=en`, 1 FAQ terbuka |

### Dilewati

| ID | Judul | Alasan |
|---|---|---|
| G-36 | 3.16 Struktur Database (fisik, dengan PromptUsage) | Butuh akses Supabase Table Editor atau ekspor dbdiagram.io — di luar jangkauan Playwright/screenshot aplikasi. **Alternatif:** gunakan `ERD.png` (versi logis, sudah memuat PromptUsage) atau minta tim ekspor manual dari Supabase. |
| G-18 (MODEL-ROUTING) | Diagram Pemilihan Model & Fallback | Opsional di plan.md; informasinya sudah tercakup di `ARCH.png`, `SEQ-02-ChatRAG.png`, dan `FC-07-ChatRAG.png` (loop model + fallback), jadi tidak dibuat sebagai diagram berdiri sendiri. Beri tahu saya bila PM tetap ingin diagram terpisah. |

## C. Perbedaan plan.md vs kode (ditemukan & diikuti kode)

1. **CC (Cyclomatic Complexity):** `plan.md` memperkirakan login = 16; nilai terukur ESLint (`PENGUJIAN_WHITEBOX.md`) = **19**. Nilai login/chat/delete-history di semua CFG baru memakai angka terukur (19 / 25 / 25 / 8), bukan estimasi.
2. **WB-10:** `plan.md` sendiri menyarankan dipecah 2 — dilakukan (`WB-10-PostChat` + `WB-10b-StreamChatResponse`), masing-masing CC=25.
3. **SearchLog/TrendingIssue di ERD:** `plan.md` tidak menegaskan jenis relasinya; migration.sql hanya mengonfirmasi `ON DELETE CASCADE` untuk Chat, ChatHistory, Transaction, dan PromptUsage — FK SearchLog/TrendingIssue ditandai **opsional (nullable)**, bukan cascade, agar tidak mengklaim perilaku yang belum terverifikasi di kode.
4. **Model non-PlantUML (G-20, G-21):** instruksi kerja mewajibkan versi PlantUML baru untuk kedua diagram ini (bukan opsional seperti kesan awal di `plan.md`) — sudah dibuat (`ACT-01-ChatbotActivity`, `ACT-02-UserFlow`).

## D. Ringkasan Akhir

- **Diagram PlantUML:** 82 dibuat (PNG+SVG = 164 file), semua lolos render tanpa error sintaks dan sudah diverifikasi visual (teks terbaca, tidak terpotong, tidak ada banner peringatan).
  - Semua diagram 🔄 di plan.md diperbarui, ditambah ACT-01/ACT-02 (semula "bukan PlantUML", sekarang dibuat PlantUML) serta FC-06 dan WB-20 (middleware berubah 17 Okt: BUG-08).
  - 11 ➕ wajib + 6 ➕ opsional baru — semua 11 wajib selesai; 5 dari 6 opsional selesai (G-13 Preferences, G-17 ResolveCitation, G-33 screenshot, G-37 screenshot, G-43 WB-RateLimit); **G-18 MODEL-ROUTING dilewati** (lihat bagian A, sudah tercakup di diagram lain).
- **Tangkapan layar:** 10 jadi — 2 diperbarui (G-30, G-31), 6 baru wajib (G-32, G-34, G-35, G-36b, G-37b, G-37c), 2 baru opsional (G-33, G-37). Diambil dalam mode gelap dari server dev (`next dev`), sehingga ikon bulat "N" milik Next.js terlihat di pojok kiri bawah. Jika PM ingin mode terang atau tanpa ikon itu, ambil ulang dari build produksi.
  - **1 dilewati:** G-36 Struktur Database (di luar jangkauan Playwright, lihat bagian B).
- **Akun uji `test@mail.com`:** riwayat chat bersih (0 chat tersisa) setelah pembersihan otomatis di setiap test. 2 baris PromptUsage tersisa dari G-30 & G-33 (jawaban live sungguhan) — ini **sesuai desain**, karena PromptUsage memang tidak ikut terhapus saat riwayat chat dihapus (lihat SEQ-15-DeleteChat).
- **File sementara** (`_shots.spec.js`, `playwright.shots.config.js`) sudah dihapus sesuai instruksi.
- **Perbaikan bonus:** syntax warna PlantUML deprecated diperbaiki di seluruh `whitebox.puml` (103 kemunculan, 23 diagram) — meningkatkan kualitas render semua CFG, tidak hanya yang direncanakan.
