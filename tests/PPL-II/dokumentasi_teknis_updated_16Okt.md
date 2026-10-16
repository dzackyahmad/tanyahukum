# Dokumentasi Teknis TanyaHukum

> **Versi 1.2** · Pembaruan 16–17 Oktober 2026
> Dokumen ini adalah dokumentasi teknis **lengkap** aplikasi TanyaHukum: perancangan, kebutuhan fungsional dan non-fungsional, rancangan API, database, implementasi fitur AI, dan **seluruh hasil evaluasi internal** (black box, white box, non-fungsional, response time, Ragas). Penomoran bab mengikuti Dokumentasi Teknis PPL-II, sehingga setiap bagian bisa langsung dipakai untuk penyusunan.
>
> Diagram (deployment, arsitektur, context, ERD, use case, DFD, flowchart, sequence) tersedia sebagai gambar di [`docs/Diagram_Doktek.md`](../../docs/Diagram_Doktek.md). Data mentah dan skrip pengujian ada di folder `tests/PPL-II/`.

---

## Daftar Isi

- [Catatan Sejarah Perbaikan](#catatan-sejarah-perbaikan)
- [BAB I Pengantar](#bab-i-pengantar)
- [BAB II Perancangan](#bab-ii-perancangan)
  - [2.1 Deskripsi Umum Aplikasi](#21-deskripsi-umum-aplikasi)
  - [2.2 Fungsi Produk](#22-fungsi-produk)
  - [2.3 Batasan Aplikasi](#23-batasan-aplikasi)
  - [2.4 Karakteristik Pengguna](#24-karakteristik-pengguna)
  - [2.5 Lingkup Operasi](#25-lingkup-operasi)
  - [2.7.1 Arsitektur Sistem](#271-arsitektur-sistem)
  - [2.7.9 Data Requirement](#279-data-requirement)
  - [2.7.10 ERD](#2710-erd)
  - [2.7.11 Rancangan API](#2711-rancangan-api)
  - [2.7.12 Kebutuhan Fungsional](#2712-kebutuhan-fungsional)
  - [2.7.13 Kebutuhan Non-Fungsional](#2713-kebutuhan-non-fungsional)
- [BAB III Implementasi](#bab-iii-implementasi)
  - [3.1 Implementasi Antarmuka](#31-implementasi-antarmuka-aplikasi-ui)
  - [3.2 Implementasi Database](#32-implementasi-database)
  - [3.3 Implementasi Fitur AI](#33-implementasi-fitur-ai)
- [BAB IV Evaluasi](#bab-iv-evaluasi)
  - [4.2.1 Black Box Testing](#421-black-box-testing)
  - [4.2.2 White Box Testing](#422-white-box-testing)
  - [4.2.3 Pengujian Non-Fungsional](#423-pengujian-non-fungsional)
  - [4.2.4 Evaluasi Sistem RAG (Ragas)](#424-evaluasi-sistem-rag-ragas)
  - [4.2.5 Audit & Bug yang Diperbaiki](#425-audit--bug-yang-diperbaiki)
- [Lampiran](#lampiran)

---

## Catatan Sejarah Perbaikan

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 28 Mei 2026 | Dokumen awal. Black box 145 kasus, white box 20 modul, Ragas Eval-1 dan Eval-2. |
| 1.1 | 1 Okt 2026 | Hardening keamanan (30 perbaikan), disclaimer AI, desain ulang chat, sitasi yang bisa diklik, onboarding tour, saran pertanyaan, panel "Proses" (transparansi). |
| **1.2** | **16–17 Okt 2026** | Pilihan 5 model × 2 mode (Kilat/Berpikir), default Gemini 3.5 Flash-Lite · Kilat; Gemini 2.5 Flash diganti Gemini 3.6 Flash. Tombol Stop, Salin, dan Edit pertanyaan. Hapus semua riwayat. Kuota harian berbasis tabel `PromptUsage`. Fallback model yang lebih tangguh. Personalisasi AI (7 preferensi gaya jawaban). Halaman Kebijakan Privasi dan Syarat & Ketentuan (ID/EN). Tampilan Profil disederhanakan. Optimasi response time. Halaman utama langsung ke Chatbot; Dashboard dan Pusat Data wajib login. 9 bug dan 1 celah keamanan diperbaiki. 232 unit test dan 9 uji E2E. Evaluasi response time dan Ragas v3. |

---

# BAB I Pengantar

## 1.1 Ringkasan Isi Dokumen

Dokumen ini menjelaskan rancangan dan implementasi TanyaHukum versi 1.2, lalu membuktikan kualitasnya lewat pengujian internal:
- **BAB II** memuat deskripsi aplikasi, fungsi produk, batasan, karakteristik pengguna, arsitektur, data, ERD, rancangan API lengkap, serta kebutuhan fungsional dan non-fungsional.
- **BAB III** memuat implementasi antarmuka, database, dan fitur AI (pipeline RAG).
- **BAB IV** memuat seluruh hasil evaluasi internal beserta cara pengujiannya.

## 1.2 Tujuan Penulisan, Aplikasi, dan Fungsi Dokumen

| Aspek | Penjelasan |
|---|---|
| Tujuan penulisan | Menjadi acuan teknis tunggal bagi tim pengembang, penguji, dan penilai PPL-II. |
| Aplikasi | TanyaHukum: asisten informasi hukum Indonesia berbasis AI dengan metode *Retrieval-Augmented Generation* (RAG). |
| Fungsi dokumen | Acuan pengembangan, pemeliharaan, dan pengujian; bukti pemenuhan kebutuhan; bahan penyusunan laporan. |

## 1.3 Referensi

1. Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
2. Undang-Undang Nomor 28 Tahun 2014 tentang Hak Cipta (Pasal 42).
3. Dokumentasi Next.js 16 (App Router), Prisma ORM 6, Pinecone, Voyage AI, Google Gemini API, Groq API, Midtrans Snap.
4. Ragas 0.2.15: *Evaluation framework for Retrieval Augmented Generation*.
5. McCabe, T. J. (1976). *A Complexity Measure*. IEEE Transactions on Software Engineering.
6. Sumber dokumen peraturan: JDIH BPK, <https://peraturan.bpk.go.id/>.

## 1.4 Daftar Singkatan

| Singkatan | Kepanjangan |
|---|---|
| AI | *Artificial Intelligence* (kecerdasan buatan) |
| API | *Application Programming Interface* |
| CC | *Cyclomatic Complexity* (kompleksitas siklomatik) |
| CSRF | *Cross-Site Request Forgery* |
| E2E | *End-to-End* |
| IDOR | *Insecure Direct Object Reference* |
| JDIH | Jaringan Dokumentasi dan Informasi Hukum |
| JWT | *JSON Web Token* |
| LLM | *Large Language Model* |
| NDJSON | *Newline-Delimited JSON* (format streaming jawaban) |
| OCR | *Optical Character Recognition* |
| RAG | *Retrieval-Augmented Generation* |
| RPD / RPM / TPM | *Requests Per Day / Requests Per Minute / Tokens Per Minute* |
| SSRF | *Server-Side Request Forgery* |
| TTFT | *Time To First Token/Text* (waktu sampai teks pertama) |
| UU PDP | Undang-Undang Pelindungan Data Pribadi |

---

# BAB II Perancangan

## 2.1 Deskripsi Umum Aplikasi

TanyaHukum adalah aplikasi web yang membantu masyarakat memahami peraturan perundang-undangan Indonesia, khususnya bidang **ketenagakerjaan** dan **perdata**. Pengguna mengetik pertanyaan dalam bahasa sehari-hari. Sistem kemudian mencari potongan dokumen peraturan yang relevan di database vektor, dan model bahasa (LLM) menyusun jawaban **hanya berdasarkan dokumen tersebut**, lengkap dengan sumber (nama peraturan dan halaman) yang bisa diklik.

| Aspek | Keterangan |
|---|---|
| Jenis aplikasi | Aplikasi web responsif (desktop & HP), mode terang/gelap |
| Metode AI | RAG: Voyage AI (embedding) → Pinecone (pencarian vektor) → LLM (Gemini / Groq) |
| Basis pengetahuan | 5.000 regulasi terdaftar (1.688 Ketenagakerjaan, 3.312 Perdata); 193 dokumen sudah diindeks menjadi **78.313 potongan teks** |
| Model jawaban | Gemini 3.5 Flash-Lite (default), Gemini 3.6 Flash, Gemini 3.5 Flash, GPT-OSS 120B, Qwen 3.8; masing-masing punya mode **Kilat** dan **Berpikir** |
| Monetisasi | Paket Basic (gratis, batas pertanyaan harian) dan Pro (Rp 49.900 via Midtrans) |
| Biaya infrastruktur | Seluruh layanan memakai tier gratis |

## 2.2 Fungsi Produk

### 2.2.1 Fungsionalitas Aplikasi

| No | Modul | Fungsi | Keterangan |
|---|---|---|---|
| F-01 | Autentikasi | Registrasi dan login email/password | Password di-hash bcrypt; sesi berupa cookie JWT `httpOnly` (7 hari). |
| F-02 | Autentikasi | Login dengan Google | Akun baru otomatis terdaftar (tier FREE, role USER). |
| F-03 | Autentikasi | Lupa dan reset password | Link reset via email (Gmail SMTP); token di-hash SHA-256, berlaku 1 jam, sekali pakai. |
| F-04 | Chatbot AI | Tanya jawab hukum berbasis RAG | Jawaban hanya dari dokumen di database, dengan sitasi nama peraturan dan halaman. |
| F-05 | Chatbot AI | Sitasi bisa diklik | Nomor sitasi membuka dokumen sumber di Pusat Data Hukum. |
| F-06 | Chatbot AI | Panel "Proses" (transparansi) | Tahapan (cari → berpikir → menulis), dokumen yang dibaca, ringkasan proses berpikir, model yang dipakai, dan waktu per tahap. |
| F-07 | Chatbot AI | Pemilih model dan mode | Atas: 5 model; bawah: mode **Kilat** atau **Berpikir**. Default Gemini 3.5 Flash-Lite · Kilat. Pilihan disimpan di browser. |
| F-08 | Chatbot AI | Tombol Stop | Menghentikan AI yang sedang menjawab; jawaban sebagian tidak disimpan. |
| F-09 | Chatbot AI | Edit pertanyaan yang dihentikan | Pertanyaan yang di-Stop bisa diedit dan dikirim ulang. |
| F-10 | Chatbot AI | Salin pesan | Salin jawaban AI maupun pesan pengguna. |
| F-11 | Chatbot AI | Saran pertanyaan & onboarding | 21 saran pertanyaan teruji (acak) dan tur pengenalan untuk pengguna baru. |
| F-12 | Chatbot AI | Disclaimer AI | Pemberitahuan bahwa jawaban AI bukan nasihat hukum. |
| F-13 | Riwayat chat | Daftar, ganti nama, hapus chat | Hanya pemilik chat yang bisa mengakses. |
| F-14 | Riwayat chat | Hapus semua riwayat | Profil › Akun, konfirmasi 2 langkah (penjelasan → ketik `HAPUS`). |
| F-15 | Kuota | Batas pertanyaan harian akun FREE | PRO tanpa batas. Kuota dicatat terpisah dari riwayat (`PromptUsage`), sehingga menghapus riwayat tidak mengembalikan kuota. |
| F-16 | Pusat Data Hukum | Cari, filter, lihat, unduh peraturan | Paginasi, filter kategori, urutan; jumlah dilihat per dokumen; unduhan lewat proxy aman. |
| F-17 | Dashboard | Statistik dan isu hukum terkini | Dokumen populer, pencarian terbanyak, isu tren. |
| F-18 | Langganan | Upgrade ke PRO via Midtrans | Webhook pembayaran diverifikasi signature-nya dan idempotent. |
| F-19 | Profil | Ubah nama, foto, dan konteks personal; ganti kata sandi; tema; hapus akun | Foto profil di-crop dan disimpan di Supabase Storage; konteks personal maks. 500 karakter. |
| F-20 | Personalisasi AI | Preferensi gaya jawaban | 7 pengaturan dropdown: gaya bahasa, panjang jawaban, judul & daftar, kutipan pasal, contoh penerapan, langkah praktis, bahasa jawaban. Disimpan di browser; server hanya menerima opsi resmi (whitelist). |
| F-21 | Legal | Kebijakan Privasi dan Syarat & Ketentuan | Dua halaman statis (`/privacy-policy`, `/terms-of-service`), dua bahasa (ID/EN), daftar isi, FAQ, bisa dicetak/PDF; dibuka di tab baru dari Profil › Akun. |
| F-22 | Admin | Dashboard admin | Statistik pengguna, interaksi, regulasi, pencarian. |
| F-23 | Admin | Kelola pengguna | Tambah, ubah (role, tier, batas kuota), hapus pengguna. |
| F-24 | Admin | Kelola regulasi | Tambah, upload file, ubah, hapus dokumen regulasi. |
| F-25 | Admin | Kelola isu tren & log pencarian | Tambah, ubah, hapus isu tren; lihat log pencarian. |

### 2.2.2 Fungsi Non-Fungsional

| No | Aspek | Implementasi |
|---|---|---|
| NF-01 | Keamanan | JWT HS256 di cookie `httpOnly`/`Secure`/`SameSite=Lax`, proteksi CSRF (cek `Origin`), rate limit per endpoint, cek kepemilikan data (anti-IDOR), anti-SSRF, validasi input, whitelist preferensi AI (anti prompt injection), error internal tidak dibocorkan. |
| NF-02 | Performa | Jawaban mulai tampil ±1,5–4 dtk dan selesai ±4–6 dtk pada mode default; streaming membuat jawaban terlihat saat ditulis. |
| NF-03 | Ketersediaan | Jika model gagal sebelum menulis (kuota habis, server sibuk, stream rusak), sistem otomatis pindah ke model cadangan tanpa menunggu. |
| NF-04 | Akurasi & transparansi | Jawaban hanya dari dokumen; sitasi wajib menyebut nama dokumen lengkap; proses berpikir dan dokumen yang dibaca bisa dilihat. |
| NF-05 | Kegunaan | Responsif desktop/HP, mode gelap, onboarding, menu yang selalu muat di layar, dua bahasa untuk dokumen legal. |
| NF-06 | Privasi | Pengguna bisa menghapus chat, seluruh riwayat, atau akun; tidak ada cookie iklan/pelacak; cache proses dibersihkan saat logout. |
| NF-07 | Biaya | Seluruh layanan memakai tier gratis (Gemini, Groq, Voyage, Pinecone, Supabase, Vercel). |
| NF-08 | Pemeliharaan | 232 unit test + 9 uji E2E otomatis; coverage baris 85%; skrip evaluasi bisa diulang. |

## 2.3 Batasan Aplikasi

1. **Bukan nasihat hukum.** Jawaban adalah informasi hukum umum dari AI dan tidak menggantikan advokat.
2. **Cakupan dokumen terbatas.** Basis pengetahuan berfokus pada ketenagakerjaan dan perdata; baru 193 dari 5.000 regulasi yang sudah diindeks ke database vektor. Pertanyaan di luar cakupan dijawab "belum menemukan informasi yang spesifik".
3. **Kualitas teks dokumen.** Dokumen hasil OCR dapat mengandung salah ketik atau tabel yang rusak; sebagian judul dokumen masih berupa nama file (mis. "2023pd3332009").
4. **Batas tier gratis.** Voyage 3 request/menit; Gemini Flash 20 request/hari dan Flash-Lite 500 request/hari per project; Groq ±8.000 token/menit. Model Groq hanya membaca 20 potongan dokumen teratas.
5. **Ketergantungan layanan pihak ketiga.** Ketersediaan jawaban bergantung pada penyedia model dan layanan cloud.
6. **Bahasa.** Antarmuka berbahasa Indonesia; jawaban bisa dalam bahasa Inggris lewat preferensi, tetapi dokumen sumber berbahasa Indonesia.

## 2.4 Karakteristik Pengguna

| Pengguna | Hak akses | Jumlah akun (16 Okt 2026) |
|---|---|---|
| Tamu (belum login) | Halaman utama, Kebijakan Privasi, Syarat & Ketentuan, daftar/login | — |
| Pengguna FREE (Basic) | Chatbot dengan batas pertanyaan harian, Pusat Data Hukum, Dashboard, Profil | 51 |
| Pengguna PRO | Seperti FREE, tanpa batas pertanyaan harian | 21 |
| Admin | Panel admin: pengguna, regulasi, isu tren, log pencarian, statistik | 5 |

Target pengguna: masyarakat umum, pekerja dan pengusaha (UMKM), mahasiswa hukum, serta praktisi yang membutuhkan rujukan cepat.

## 2.5 Lingkup Operasi

| Aspek | Keterangan |
|---|---|
| Klien | Browser modern (Chrome, Edge, Firefox, Safari) di desktop dan HP |
| Hosting aplikasi | Vercel (Next.js 16, region iad1/AS) |
| Database | Supabase PostgreSQL (Singapura) via Prisma ORM 6 |
| Penyimpanan file | Supabase Storage (foto profil), penyimpanan dokumen regulasi (`*.supabase.co`, `*.r2.dev`) |
| Database vektor | Pinecone, index `tanyahukum2` (1.024 dimensi) |
| Layanan AI | Voyage AI (`voyage-law-2`), Google Gemini API, Groq API |
| Pembayaran | Midtrans Snap (sandbox/production) |
| Email | Gmail SMTP (Nodemailer) |

## 2.7.1 Arsitektur Sistem

```
┌──────────────────────────── Klien (Browser) ────────────────────────────┐
│ Next.js App Router (React 19, Tailwind) · localStorage: sesi UI, mode,  │
│ preferensi AI, tema · cookie httpOnly "token" (JWT)                      │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ HTTPS (JSON / NDJSON streaming)
┌───────────────▼──────────── Server (Vercel) ────────────────────────────┐
│ middleware.js: CSRF, guard /admin, /api/admin, /dashboard, /pusat-data  │
│ Route Handlers app/api/**: auth, chat (RAG), regulations, dashboard,    │
│ payment, profile, admin · lib/: auth (jose), rateLimit (LRU), security  │
└──┬──────────────┬──────────────┬──────────────┬──────────────┬──────────┘
   │ Prisma       │ embedding    │ vector query │ LLM          │ pembayaran/email/storage
┌──▼─────────┐ ┌──▼────────┐ ┌───▼────────┐ ┌───▼──────────┐ ┌─▼───────────────────┐
│ Supabase   │ │ Voyage AI │ │ Pinecone   │ │ Gemini API / │ │ Midtrans · Gmail    │
│ PostgreSQL │ │ law-2     │ │ tanyahukum2│ │ Groq API     │ │ SMTP · Supabase     │
└────────────┘ └───────────┘ └────────────┘ └──────────────┘ └─────────────────────┘
```

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js 16.3 (App Router, Turbopack), React 19.2, Tailwind CSS, react-markdown, recharts, react-easy-crop |
| Backend | Next.js Route Handlers (Node.js), Prisma 6.19, jose & jsonwebtoken (JWT HS256), bcrypt, lru-cache, nodemailer, midtrans-client |
| AI | LangChain (`@langchain/google-genai`, `@langchain/community` VoyageEmbeddings), Pinecone SDK 5, Groq (REST, OpenAI-compatible) |
| Ingest dokumen | LlamaParse (OCR), `RecursiveCharacterTextSplitter`, Voyage AI, Pinecone (skrip `scripts/ingest-voyage-final.js`) |
| Pengujian | Jest 29 (+ Istanbul coverage), Playwright, ESLint (`complexity`), Ragas 0.2.15 (Python) |

Diagram arsitektur 4 lapis, deployment, dan context tersedia di [`docs/Diagram_Doktek.md`](../../docs/Diagram_Doktek.md). Catatan: diagram tersebut masih menyebut Gemini 2.5 Flash sebagai satu-satunya LLM dan belum memuat tabel `PromptUsage`; isi terbaru ada di dokumen ini.

## 2.7.9 Data Requirement

| Data | Sumber | Disimpan di | Keterangan |
|---|---|---|---|
| Akun pengguna | Registrasi / Google | PostgreSQL `User` | Password hash bcrypt |
| Profil & konteks personal | Pengguna | `User`, Supabase Storage | Konteks maks. 500 karakter |
| Percakapan | Chatbot | `Chat`, `ChatHistory` | Dihapus oleh pengguna kapan saja |
| Pemakaian kuota | Otomatis | `PromptUsage` | Hanya waktu & userId |
| Transaksi | Midtrans | `Transaction` | Status PENDING/SUCCESS/FAILED |
| Regulasi (metadata) | Scraper JDIH BPK, admin | `Regulation` | Judul, kategori, file, jumlah dilihat |
| Regulasi (isi, vektor) | Ingest dokumen | Pinecone | Potongan 1.000 karakter + metadata |
| Isu tren | Admin | `TrendingIssue` | Ditampilkan di dashboard |
| Log pencarian | Pusat Data Hukum | `SearchLog` | Kata kunci + userId (opsional) |
| Preferensi UI & AI | Pengguna | localStorage browser | Mode/model, preferensi gaya jawaban, tema |

## 2.7.10 ERD

```
User 1──* Chat 1──* ChatHistory        User 1──* Transaction
User 1──* ChatHistory                   User 1──* PromptUsage   (baru, 16 Okt 2026)
User 1──* SearchLog (opsional)          User 1──* TrendingIssue (createdBy, opsional)
Regulation (berdiri sendiri; isi teksnya di Pinecone dengan metadata regulationId)
```

| Tabel | Kolom utama | Relasi / aturan hapus |
|---|---|---|
| `User` | id (uuid), name, email (unik), passwordHash, authProvider, supabaseId, avatarUrl, role (USER/ADMIN/AI), personalContext, tier (FREE/PRO), promptLimit (default 50), resetToken (hash), resetTokenExpiry, createdAt, updatedAt | Induk semua data pengguna |
| `Chat` | id, userId, title, createdAt, updatedAt | → User (CASCADE) |
| `ChatHistory` | id, userId, chatId, role (USER/AI), content, createdAt | → Chat (CASCADE), → User (CASCADE) |
| `PromptUsage` | id, userId, createdAt; indeks (userId, createdAt) | → User (CASCADE); **tidak** terhubung ke Chat |
| `Transaction` | id, orderId (unik), userId, amount, status (PENDING/SUCCESS/FAILED), paymentUrl, createdAt, updatedAt | → User (CASCADE) |
| `Regulation` | id, title, description, fileUrl, filePath, fileName, fileSize, isProcessed, category, content, viewCount, isActive, createdAt, updatedAt; indeks viewCount | — |
| `TrendingIssue` | id, title, description, publishDate, newsLink, location, isActive, createdBy | → User (opsional) |
| `SearchLog` | id, query, userId, createdAt; indeks createdAt dan (query, createdAt) | → User (opsional) |

## 2.7.11 Rancangan API

Semua endpoint berada di `app/api/**/route.js` (Next.js App Router, 26 berkas, 40 handler) dan bertukar data dalam format JSON, kecuali streaming chat (NDJSON) dan unduhan file.

#### a. Ringkasan endpoint (26 berkas route, 40 handler)

| No | Method | Endpoint | Akses | Fungsi | Rate limit |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | Publik | Registrasi email & password | 10/menit/IP |
| 2 | POST | `/api/auth/login` | Publik | Login, set cookie sesi | 5/menit/IP + 10/menit/email |
| 3 | POST | `/api/auth/google` | Publik | Login/daftar dengan Google | 10/menit/IP |
| 4 | POST | `/api/auth/forgot-password` | Publik | Kirim link reset password | 3/15 menit/IP |
| 5 | POST | `/api/auth/reset-password` | Publik | Ganti password dengan token | 10/menit/IP |
| 6 | POST | `/api/logout` | Publik | Hapus cookie sesi | — |
| 7 | POST | `/api/chat` | Login | Bertanya ke AI (JSON / streaming NDJSON) | 15/menit/pengguna + kuota harian FREE |
| 8 | GET | `/api/chat` | Login | Daftar chat / isi chat | — |
| 9 | PATCH | `/api/chat` | Login (pemilik) | Ganti nama chat | — |
| 10 | DELETE | `/api/chat?chatId=` | Login (pemilik) | Hapus satu chat | — |
| 11 | DELETE | `/api/chat/history` | Login | Hapus semua riwayat (`{confirm:"HAPUS"}`) | 3/menit/pengguna |
| 12 | GET | `/api/regulations` | Publik | Daftar/cari regulasi | log pencarian 30/menit/IP |
| 13 | GET | `/api/regulations/[id]` | Publik | Detail regulasi (+ jumlah dilihat) | view 3/menit/IP/dokumen |
| 14 | PATCH | `/api/regulations/[id]` | Publik | Tambah jumlah dilihat | 3/menit/IP/dokumen |
| 15 | GET | `/api/regulations/download` | Publik | Proxy unduh dokumen (anti-SSRF) | — |
| 16 | GET | `/api/regulations/resolve` | Publik | Cocokkan judul sitasi AI ke dokumen | 60/menit/IP |
| 17 | GET | `/api/dashboard` | Login | Statistik dashboard pengguna | — (cache 30 dtk) |
| 18 | POST | `/api/payment/checkout` | Login | Buat transaksi Midtrans Snap | — |
| 19 | GET | `/api/payment/webhook` | Publik | Health check webhook | — |
| 20 | POST | `/api/payment/webhook` | Midtrans (signature) | Notifikasi status pembayaran | — |
| 21 | GET | `/api/profile` | Login | Lihat profil (+ sinkronisasi status pembayaran) | — |
| 22 | PATCH | `/api/profile` | Login | Ubah profil / password / konteks personal | — |
| 23 | DELETE | `/api/profile` | Login | Hapus akun | — |
| 24 | POST | `/api/profile/upload` | Login | Upload foto profil | — |
| 25 | GET | `/api/admin/dashboard/stats` | Admin | Statistik admin | — |
| 26 | GET | `/api/admin/regulations` | Admin | Daftar regulasi (termasuk nonaktif) | — |
| 27 | POST | `/api/admin/regulations` | Admin | Tambah regulasi | — |
| 28 | PATCH | `/api/admin/regulations/[id]` | Admin | Ubah regulasi | — |
| 29 | DELETE | `/api/admin/regulations/[id]` | Admin | Hapus regulasi | — |
| 30 | POST | `/api/admin/regulations/upload` | Admin | Upload file PDF regulasi | — |
| 31 | GET | `/api/admin/search-logs` | Admin | 100 log pencarian terbaru | — |
| 32 | POST | `/api/admin/search-logs` | Admin | Tambah log pencarian | — |
| 33 | GET | `/api/admin/trending` | Admin | Daftar isu tren | — |
| 34 | POST | `/api/admin/trending` | Admin | Tambah isu tren | — |
| 35 | PATCH | `/api/admin/trending/[id]` | Admin | Ubah isu tren | — |
| 36 | DELETE | `/api/admin/trending/[id]` | Admin | Hapus isu tren | — |
| 37 | GET | `/api/admin/users` | Admin | Daftar pengguna + sisa kuota | — |
| 38 | POST | `/api/admin/users` | Admin | Tambah pengguna | — |
| 39 | PATCH | `/api/admin/users/[id]` | Admin | Ubah pengguna | — |
| 40 | DELETE | `/api/admin/users/[id]` | Admin | Hapus pengguna | — |

#### b. Aturan umum

- **Sesi:** cookie `token` berisi JWT HS256 dengan payload `{ userId, email, tier, role }`, berlaku 7 hari. Atribut: `httpOnly`, `secure` (production), `sameSite: lax`, `path: /`.
  - Diverifikasi dengan `getSession()` (`jose`) di sebagian besar route.
  - Route `/api/profile*` memakai `verifyToken()` (`jsonwebtoken`, dikunci HS256).
- **Middleware (`middleware.js`):** berlaku untuk semua path kecuali aset statis.
  - **CSRF:** request POST/PATCH/DELETE ke `/api` dengan header `Origin` dari host lain → 403. Request tanpa `Origin`, seperti webhook Midtrans, tetap lolos.
  - **Halaman `/admin*`:** role bukan ADMIN → redirect ke `/chatbot`.
  - **Halaman `/dashboard*` dan `/pusat-data*`:** tanpa token JWT yang valid → redirect ke `/chatbot` (tamu bisa login lewat tombol Masuk di sana). Data kedua halaman ini sejak awal sudah dilindungi API (`getSession()`); guard ini mencegah tampilan halaman terbuka untuk tamu (BUG-08).
  - **Halaman `/chatbot`, `/privacy-policy`, `/terms-of-service`:** tetap bisa dibuka tamu (disengaja). Mengirim pertanyaan tetap wajib login.
  - **`/api/admin*`:** tanpa token → 401; `JWT_SECRET` kosong → 500; role bukan ADMIN → 403; token tidak valid/kedaluwarsa → 401.
  - **Header respons:** `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0`.
- **Lapisan kedua untuk admin:** setiap handler admin memanggil `requireAdmin()`, yang mengecek role ADMIN langsung ke database, bukan hanya dari JWT.
- **Rate limit (`lib/rateLimit.js`):** cache in-memory per instance server (LRU, maks. 5.000 key) dengan jendela tetap 60 detik sejak request pertama. Request ke-(maks+1) → 429.
- **Format error:** `{ "error": "<pesan>" }` dengan status 400/401/403/404/409/413/429/500. Pesan error database tidak diteruskan ke klien.

#### c. Autentikasi

**`POST /api/auth/register`**
- Request: `{ email, password }`. Email di-trim, di-lowercase, dan dicek regex. Password di-trim, minimal 8 karakter.
- Sukses: `201 { message: "Registrasi berhasil" }`.
- Error:
  - 400: field kosong, format email salah, atau password < 8.
  - 409: email sudah terdaftar (pesan khusus jika akun Google).
  - 429, 500.
- Efek: membuat `User` dengan `passwordHash` bcrypt. Default `tier FREE`, `role USER`, `promptLimit 50`.

**`POST /api/auth/login`**
- Request: `{ email, password }`. Email di-trim dan di-lowercase; password minimal 8 karakter.
- Pemeriksaan password: dibandingkan apa adanya. Jika gagal dan password diawali/diakhiri spasi, dibandingkan lagi versi ter-trim (agar konsisten dengan registrasi).
- Sukses: `200 { message, user: { id, email, tier, promptLimit, role, name, avatarUrl } }` dan cookie `token` diset.
- Error:
  - 400: body bukan JSON atau input tidak valid.
  - 401 `Email atau password salah`: pesan generik. bcrypt tetap dijalankan dengan hash tiruan saat email tidak ditemukan (anti timing attack).
  - 429, 500.

**`POST /api/auth/google`**
- Request: `{ credentialToken }`, yaitu ID token Google.
- Sukses: `200 { message, user: { id, email, tier, promptLimit, authProvider, role, name, avatarUrl } }` dan cookie `token` diset.
- Error:
  - 400: token kosong atau payload tanpa email.
  - 401: token tidak valid.
  - 403: email belum terverifikasi.
  - 429.
  - 500: `GOOGLE_CLIENT_ID` belum diset.
- Efek: memverifikasi token ke Google (audience = `GOOGLE_CLIENT_ID`). Jika email belum terdaftar, `User` baru dibuat (`authProvider GOOGLE`, `tier FREE`, `role USER`, nama dan foto dari Google).

**`POST /api/auth/forgot-password`**
- Request: `{ email }`.
- Sukses: `200 { message: "Jika email terdaftar, link reset telah dikirim." }`. Respons generik ini mencegah enumerasi akun.
- Error: 400 (email kosong/format salah), 429 (3 request per 15 menit per IP, memakai penghitung sendiri), 500.
- Efek: jika email terdaftar, dibuat token acak 32 byte. Hash SHA-256-nya disimpan ke `User.resetToken` dengan masa berlaku 1 jam, lalu email berisi link `/reset-password?token=…` dikirim lewat SMTP.

**`POST /api/auth/reset-password`**
- Request: `{ token, newPassword }`, dengan `newPassword` minimal 8 karakter.
- Sukses: `200 { message: "Password berhasil diubah. Silakan login kembali." }`.
- Error: 400 (field tidak valid, atau token tidak valid/kedaluwarsa), 429, 500.
- Efek: `passwordHash` baru (bcrypt). `resetToken` dikosongkan, sehingga token hanya bisa dipakai sekali.

**`POST /api/logout`**
- Selalu menghapus cookie `token` (kedaluwarsa), lalu mengembalikan `303` redirect ke `/login`.
- Jika ada sesi Supabase, sesi itu ikut di-*sign out*.

#### d. Chat AI

**`POST /api/chat`**

Akses wajib login. `userId` selalu diambil dari token, tidak pernah dari body.

| Field body | Wajib | Aturan |
|---|---|---|
| `message` | Ya | string, maks. 5.000 karakter |
| `chatId` | Tidak | string; chat harus ada dan milik pengguna |
| `mode` | Tidak | salah satu dari 10 nilai di bawah; jika kosong/tidak valid dipakai `deep` |
| `preferences` | Tidak | objek preferensi gaya jawaban; hanya kunci & nilai whitelist yang dipakai |
| `stream` | Tidak | `true` → respons streaming NDJSON |

| `mode` | Provider | Model | Thinking | Catatan |
|---|---|---|---|---|
| `lite` / `lite-think` | Gemini | `gemini-3.5-flash-lite` | tidak / ya | default UI: `lite` |
| `fast` / `deep` | Gemini | `gemini-3.6-flash` (atau `GEMINI_MODEL`) | tidak / ya | default API: `deep` |
| `next-fast` / `next` | Gemini | `gemini-3.5-flash` | tidak / ya | |
| `gptoss-fast` / `gptoss` | Groq | `openai/gpt-oss-120b` | effort low / medium | konteks 20 potongan |
| `qwen` / `qwen-think` | Groq | `qwen/qwen3.8-27b` | none / medium | konteks 20 potongan |

Kunci `preferences` yang diizinkan:

| Kunci | Nilai |
|---|---|
| `style` | `simple`, `formal`, `technical` |
| `length` | `short`, `detailed` |
| `structure` | `less`, `more` |
| `citation` | `quote`, `brief` |
| `examples` | `include`, `none` |
| `nextSteps` | `include` |
| `language` | `id`, `en` |

Urutan validasi: sesi → JSON → `message` → rate limit (15/menit/pengguna) → `chatId` → baca database paralel (chat, user, pemakaian kuota hari ini) → kepemilikan chat → user ada → kuota (FREE: jumlah `PromptUsage` hari ini ≥ `promptLimit` → 403; PRO tanpa batas).

Proses RAG:
1. Embedding Voyage `voyage-law-2` (cache LRU 500 entri, 24 jam).
2. Pinecone topK 50.
3. Potongan duplikat dan potongan sampah (tabel OCR, teks < 40 karakter) dibuang; 5 teratas selalu dipertahankan.
4. Prompt sistem + konteks personal + preferensi.
5. LLM sesuai `mode`. Jika gagal sebelum teks ditulis karena kuota (429/413), server sibuk (5xx/overload), atau stream rusak, sistem pindah ke model Gemini cadangan. Model Groq dilewati bila `GROQ_API_KEY` tidak ada.

- **Respons mode JSON:** `200 { answer, chatId }`. Mode ini memakai model Gemini utama dan cadangannya; `mode` diabaikan, sedangkan `preferences` tetap dipakai.
- **Respons mode streaming:** `200`, `Content-Type: application/x-ndjson`, satu objek JSON per baris:

| `type` | Field | Kapan |
|---|---|---|
| `step` | `step` (`search`/`think`/`write`), `state` (`active`/`done`) | awal/akhir setiap tahap |
| `sources` | `count`, `used`, `filtered`, `uniqueCount`, `docs[{title,page}]` (maks. 8) | setelah pencarian |
| `model` | `model`, `provider`, `mode`, `fallback`, `contextChunks` | setiap model dicoba |
| `thinking` | `text` | ringkasan berpikir (mode Berpikir) |
| `text` | `text` | potongan jawaban |
| `done` | `chatId`, `answer`, `model`, `mode`, `durationMs` | selesai dan tersimpan |
| `error` | `error` | kuota penyedia habis / sesi chat tidak ditemukan / kesalahan server |

- **Respons error HTTP:**
  - 400: pesan kosong atau > 5.000 karakter.
  - 401: tidak login.
  - 403 `{ error, limitReached: true }`: kuota harian habis.
  - 404: chat bukan milik pengguna, atau pengguna tidak ditemukan.
  - 429: rate limit, atau semua model kena kuota (mode JSON).
  - 500.
- **Efek samping (setelah jawaban berhasil):**
  - membuat `Chat` baru jika belum ada (judul = 30 karakter pertama pesan);
  - membuat 2 `ChatHistory` (USER dan AI, selisih 1 ms);
  - membuat 1 `PromptUsage`;
  - memperbarui `Chat.updatedAt`.
- **Stop (koneksi diputus):** request ke LLM dibatalkan dan riwayat tidak disimpan. `PromptUsage` tetap dicatat bila AI sudah mulai menulis.

**`GET /api/chat`**
- Query: `userId` (wajib, harus sama dengan sesi), lalu salah satu dari:
  - `type=list` → `{ chats }`, diurutkan `updatedAt` terbaru;
  - `chatId` → `{ history }`, berisi pesan chat itu (difilter chat **dan** userId), diurutkan `createdAt`, lalu role.
- Error: 401, 500.

**`PATCH /api/chat`**
- Body: `{ chatId, title }`, dengan `title` maks. 200 karakter.
- Sukses: `200 { success: true, chat }`.
- Error: 400, 401, 403 (bukan pemilik), 500.

**`DELETE /api/chat?chatId=`**
- Sukses: `200 { success: true }`. `ChatHistory` ikut terhapus (cascade); `PromptUsage` tetap ada.
- Error: 400, 401, 403, 500.

**`DELETE /api/chat/history`**
- Body: `{ "confirm": "HAPUS" }` (harus persis).
- Sukses: `200 { success: true, deletedChats: n }`.
- Error: 400 (konfirmasi salah), 401, 429 (3/menit), 500.
- Efek: semua `Chat` milik pengguna dihapus (cascade ke `ChatHistory`). Kuota tidak dikembalikan.

#### e. Regulasi / Pusat Data Hukum

**`GET /api/regulations`**
- Query:
  - `page` (≥ 1);
  - `limit` (1–100, default 10);
  - `search` (cocok sebagian, tanpa membedakan huruf besar/kecil, pada judul/deskripsi);
  - `category` (`Semua` diabaikan);
  - `sortBy` (`title`/`viewCount`/`createdAt`/`updatedAt`);
  - `order` (`asc`/`desc`).
- Hanya regulasi aktif yang dikembalikan.
- Sukses: `200 { data: [{ id, title, description, category, fileSize, isProcessed, fileUrl, createdAt, viewCount }], meta: { totalData, currentPage, dataPerPage, totalPages } }`.
- Efek: jika ada `search`, `SearchLog` dicatat (maks. 200 karakter, `userId` dari sesi bila login; dibatasi 30/menit/IP).

**`GET /api/regulations/[id]`**
- Sukses: `200 { data: { id, title, description, fileUrl, fileName, fileSize, category, isProcessed, isActive, viewCount, createdAt, updatedAt } }`. Isi teks dan path storage internal tidak dikirim.
- Error: 400, 404 (tidak ada/nonaktif), 500.
- Efek: `viewCount + 1`, dibatasi 3/menit per IP per dokumen.

**`PATCH /api/regulations/[id]`**
- Menambah `viewCount`. Jika lewat batas 3/menit per IP per dokumen, respons tetap 200 tetapi view tidak dihitung.

**`GET /api/regulations/download`**
- Query:
  - `url` (wajib): `https` dengan host `*.supabase.co` atau `*.r2.dev` (anti-SSRF);
  - `name`: nama file; karakter berbahaya diganti `_`.
- Sukses: `200` berisi file PDF dengan header `Content-Disposition: attachment`.
- Error:
  - 400: URL tidak valid atau tidak diizinkan.
  - 413: file > 100 MB.
  - 502: upstream mengalihkan (redirect).
  - Status error dari upstream diteruskan.
  - 500.

**`GET /api/regulations/resolve`**
- Query: `title` (boleh berulang, maks. 20 judul × 300 karakter).
- Sukses: `200 { data: { "<judul lowercase>": { id, fileUrl } } }`. Pencocokan persis diutamakan, lalu akhiran `" - <judul>"`.
- Error: 429 (60/menit/IP), 500.

#### f. Dashboard

**`GET /api/dashboard`**
- Wajib login.
- Sukses: `200 { success: true, data: { summary: { total_regulasi, pengguna_aktif, interaksi_harian, pencarian_harian }, dokumen_terpopuler[10], isu_terkini[3], tren_pencarian[{date,searches}] } }`.
- Hasil di-cache 30 detik (dipakai bersama semua pengguna).
- Error: 401, 500.

#### g. Pembayaran

**`POST /api/payment/checkout`**
- Wajib login. Ditolak 400 jika pengguna sudah PRO.
- Sukses: `200 { token, redirect_url }` dari Midtrans Snap.
- Efek: membuat `Transaction` (`orderId` unik, `amount 49900`, `PENDING`), lalu menyimpan `paymentUrl`.
- Error: 401, 403 (`userId` tidak cocok), 404, 500.

**`GET /api/payment/webhook`**
- Health check: `200 { status, time, env_check }`.

**`POST /api/payment/webhook`**
- Dipanggil Midtrans dengan body `{ order_id, transaction_status, fraud_status, status_code, gross_amount, signature_key }`.
- Verifikasi signature: `SHA512(order_id + status_code + gross_amount + server key)`, dibandingkan *constant-time*. Di production, signature salah → 403.
- Pemetaan status:
  - `capture`/`settlement` → `SUCCESS`, kecuali `fraud_status` `challenge` → `PENDING`;
  - `cancel`/`deny`/`expire` → `FAILED`.
- Sukses: `200 { message: "OK" }`, atau `"Already processed"` (idempotent).
- Error: 400 (nominal tidak cocok), 403, 404 (transaksi tidak ada), 500.
- Efek saat SUCCESS (satu transaksi database): `Transaction.status = SUCCESS`, `User.tier = PRO`, `promptLimit = 0`.

#### h. Profil

**`GET /api/profile`**
- Sukses: `200 { id, name, email, avatarUrl, tier, promptLimit, personalContext }`.
- Jika pengguna FREE punya transaksi PENDING, status pembayarannya dicek ke Midtrans dan akun langsung di-upgrade bila sudah lunas.
- Error: 401, 404.

**`PATCH /api/profile`**
- Body (semua opsional):
  - `name` (maks. 100);
  - `email` (regex; hanya jika berubah);
  - `avatarUrl` (http/https atau null);
  - `currentPassword` + `newPassword` (min. 8; akun Google tanpa password ditolak);
  - `personalContext` (maks. 500 atau null).
- Sukses: `200 { message, user: { id, name, email, avatarUrl } }`.
- Error: 400 (validasi / tidak ada perubahan), 401 (password lama salah / tidak login), 404, 409 (email sudah dipakai).

**`DELETE /api/profile`**
- Sukses: `200 { message }`, dan cookie `token` dihapus.
- Efek: `User` dihapus, cascade ke `Chat`, `ChatHistory`, `PromptUsage`, dan `Transaction`.

**`POST /api/profile/upload`**
- Body: `multipart/form-data` dengan field `file`. Syarat: maks. 2 MB, ekstensi dan MIME jpg/png/webp, serta isi file (*magic bytes*) dicek.
- Sukses: `200 { message, url, user }`.
- Efek: file disimpan ke Supabase Storage bucket `avatars` (`<userId>.<ext>`), lalu `User.avatarUrl` diperbarui.
- Error: 400, 401, 500.

#### i. Admin

Semua endpoint admin melewati middleware (role dari JWT) **dan** `requireAdmin()` (role dari database).

| Endpoint | Request | Respons sukses | Catatan |
|---|---|---|---|
| `GET /api/admin/dashboard/stats` | — | `{ success, data: { cards, popularDocs, recentDocs, trendingIssues, searchTrends, categoryDistribution, userDistribution } }` | Kartu berisi total dokumen/pengguna (dengan pertumbuhan mingguan), pengguna aktif hari ini, total views, chat hari ini, jumlah PRO/FREE/admin, storage |
| `GET /api/admin/regulations` | `page`, `limit`, `search`, `category` | `{ data, meta }` | Termasuk regulasi nonaktif |
| `POST /api/admin/regulations` | `{ title*, fileUrl* (http/https), description, category, fileName, fileSize }` | `201` regulasi baru | `isActive: true` |
| `PATCH /api/admin/regulations/[id]` | `{ title, description, fileUrl, category }` | `200` regulasi | 404 jika tidak ada |
| `DELETE /api/admin/regulations/[id]` | — | `200 { message }` | File di storage tidak ikut terhapus |
| `POST /api/admin/regulations/upload` | `multipart` `file` (PDF, ≤ 50 MB, header `%PDF-`) | `200 { fileUrl, fileName, fileSize }` | Bucket `legal-documents`; record dibuat lewat POST regulasi |
| `GET /api/admin/search-logs` | — | 100 `SearchLog` terbaru + `user{name,email}` | |
| `POST /api/admin/search-logs` | `{ query*, userId }` | `201` | 400 jika `userId` tidak terdaftar |
| `GET /api/admin/trending` | — | semua `TrendingIssue` (terbaru dulu) | |
| `POST /api/admin/trending` | `{ title*, description*, publishDate, newsLink, location }` | `201` | `newsLink` dinormalisasi ke http/https |
| `PATCH /api/admin/trending/[id]` | `{ title*, description*, newsLink, location }` | `200` | |
| `DELETE /api/admin/trending/[id]` | — | `200 { message }` | |
| `GET /api/admin/users` | — | `[{ id, name, email, role, tier, promptLimit, createdAt, remainingQuota, lastActive }]` | `remainingQuota` = `promptLimit` − `PromptUsage` hari ini |
| `POST /api/admin/users` | `{ email*, password* (≥ 8), name, role (USER/ADMIN), tier (FREE/PRO), promptLimit (0–100.000) }` | `201` (tanpa `passwordHash`) | 409 email duplikat |
| `PATCH /api/admin/users/[id]` | `{ role, tier, promptLimit, email, name, avatarUrl }`; `id` harus UUID | `200` | Admin tidak bisa menurunkan role dirinya sendiri |
| `DELETE /api/admin/users/[id]` | `id` UUID | `204` | Tidak bisa menghapus diri sendiri |

Error umum endpoint admin: 401 (tidak login), 403 (bukan admin), 400 (validasi), 404/409 (data tidak ada / duplikat), 500.

## 2.7.12 Kebutuhan Fungsional

| Kode | Kebutuhan | Fungsi | Bukti pengujian | Status |
|---|---|---|---|---|
| KF-01 | Sistem harus dapat mendaftarkan dan mengautentikasi pengguna (email/password dan Google). | F-01, F-02 | `unit/auth/*` (32 kasus), `integration/auth-flow` | ✅ |
| KF-02 | Sistem harus menyediakan pemulihan kata sandi yang aman. | F-03 | TC-FP-01..06, TC-RP-01..07 | ✅ |
| KF-03 | Sistem harus menjawab pertanyaan hukum hanya berdasarkan dokumen di database dan menyertakan sumbernya. | F-04, F-05 | `unit/chat/chat.test.js`, Ragas Faithfulness 0,956–1,000 | ✅ |
| KF-04 | Sistem harus menampilkan jawaban secara streaming beserta proses dan dokumen yang dibaca. | F-06 | TC-CHAT-25..33 | ✅ |
| KF-05 | Pengguna harus dapat memilih model AI dan mode (Kilat/Berpikir). | F-07 | TC-MODE-01..05, TC-GROQ-01..04, TC-E2E-02..04 | ✅ |
| KF-06 | Pengguna harus dapat menghentikan jawaban AI; jawaban yang dihentikan tidak disimpan. | F-08 | TC-STOP-01, TC-QUOTA-03, uji Stop end-to-end | ✅ |
| KF-07 | Pengguna harus dapat menyalin pesan dan mengedit pertanyaan yang dihentikan. | F-09, F-10 | Uji manual UI | ✅ |
| KF-08 | Pengguna harus dapat mengelola riwayat chat (lihat, ganti nama, hapus, hapus semua). | F-13, F-14 | TC-CHAT-*, TC-DELALL-01..03, `security/chat-idor` | ✅ |
| KF-09 | Sistem harus membatasi pertanyaan harian akun FREE, dan batas ini tidak bisa di-reset dengan menghapus riwayat. | F-15 | TC-CHAT-27, TC-QUOTA-01..02 | ✅ |
| KF-10 | Pengguna harus dapat mencari, melihat, dan mengunduh peraturan. | F-16 | `unit/regulations/*` (25 kasus) | ✅ |
| KF-11 | Sistem harus menampilkan statistik dan isu hukum terkini. | F-17 | `api-errors`, `hardening` (dashboard wajib login) | ✅ |
| KF-12 | Pengguna harus dapat berlangganan PRO lewat Midtrans. | F-18 | `unit/payment/*`, `integration/payment-flow` | ✅ |
| KF-13 | Pengguna harus dapat mengelola profil, kata sandi, tema, dan menghapus akun. | F-19 | `unit/profile/profile.test.js` (13 kasus) | ✅ |
| KF-14 | Pengguna harus dapat mengatur gaya jawaban AI. | F-20 | TC-PREF-01..05, uji langsung API | ✅ |
| KF-15 | Pengguna harus dapat membaca Kebijakan Privasi dan Syarat & Ketentuan dalam dua bahasa. | F-21 | TC-E2E-06..09 | ✅ |
| KF-16 | Admin harus dapat mengelola pengguna, regulasi, isu tren, dan melihat statistik. | F-22..F-25 | `security/middleware-admin`, `security/hardening*` | ✅ |

## 2.7.13 Kebutuhan Non-Fungsional

| Kode | Kebutuhan | Target | Hasil terukur | Status |
|---|---|---|---|---|
| KNF-01 | Keamanan endpoint | Lulus semua test keamanan | 65/65 test `tests/security` + test anti prompt injection & kuota | ✅ |
| KNF-02 | Waktu tunggu jawaban (default) | Teks pertama ≤ 5 dtk | 1,5–3,7 dtk (Flash-Lite · Kilat) | ✅ |
| KNF-03 | Waktu jawaban lengkap (default) | ≤ 10 dtk | rata-rata 4,5 dtk (versi lama 19,6 dtk) | ✅ |
| KNF-04 | Ketersediaan saat kuota habis | Pindah model tanpa jeda | Fallback langsung (sebelumnya ±100 dtk) | ✅ |
| KNF-05 | Akurasi jawaban (RAG) | Faithfulness ≥ 0,70 | 0,956–1,000 (5 model) | ✅ |
| KNF-06 | Relevansi jawaban | Answer Relevancy ≥ 0,55 | 0,914–0,955 | ✅ |
| KNF-07 | Kualitas retrieval | Context Recall ≥ 0,60 | 0,933 (Gemini), 0,858 (Groq) | ✅ |
| KNF-08 | Kualitas kode | Coverage baris ≥ 80% | 85,2% baris, 75,2% cabang | ✅ |
| KNF-09 | Tampilan responsif | Halaman & menu muat di desktop dan HP | E2E 1280×720 dan 390×844 lulus | ✅ |
| KNF-10 | Performa endpoint | 0 error pada beban ringan | 59 request, 10 bersamaan, 0 error | ✅ |

---

# BAB III Implementasi

## 3.1 Implementasi Antarmuka Aplikasi (UI)

| Halaman / Komponen | Rute / Berkas | Isi |
|---|---|---|
| Halaman utama | `/` | Langsung dialihkan ke `/chatbot` (BUG-09) |
| Chatbot | `/chatbot` | Halaman masuk aplikasi (tamu bisa membuka; masuk/daftar lewat modal). Kotak chat dengan pemilih model & mode, saran pertanyaan, panel Proses, sitasi bisa diklik, Stop/Salin/Edit, disclaimer AI |
| Dashboard | `/dashboard` | Wajib login. Statistik, dokumen populer, isu tren |
| Pusat Data Hukum | `/pusat-data` | Wajib login. Cari, filter, detail, unduh regulasi |
| Langganan | `/subscription` | Pilih paket dan bayar via Midtrans Snap |
| Profil (modal) | `ProfileModal.jsx` | Tab Profile, Personalisasi (7 preferensi + konteks personal), Tampilan (tema), Keamanan (kata sandi), Akun (dokumen legal, hapus riwayat, hapus akun) |
| Reset password | `/reset-password` | Form kata sandi baru |
| Kebijakan Privasi | `/privacy-policy` | Dokumen legal ID/EN, daftar isi, FAQ |
| Syarat & Ketentuan | `/terms-of-service` | Dokumen legal ID/EN, daftar isi, FAQ |
| Admin | `/admin`, `/admin/data`, `/admin/manage-user` | Dashboard admin, kelola regulasi, kelola pengguna |

Tangkapan layar UI lengkap ada di dokumen utama (bagian 3.1). Komponen baru versi 1.2: `ModeToggle.jsx` (pemilih model/mode), `ProcessPanel.jsx`, `LegalDocument.jsx`, bagian Personalisasi dan Akun di `ProfileModal.jsx`.

## 3.2 Implementasi Database

- **DBMS:** PostgreSQL di Supabase (Singapura), diakses lewat Prisma ORM 6.19 (`prisma/schema.prisma`).
- **Tabel:** 8 tabel (lihat 2.7.10) dengan 3 enum: `Tier` (FREE, PRO), `Role` (USER, ADMIN, AI), dan `TransactionStatus` (PENDING, SUCCESS, FAILED).
- **Integritas referensial:** data milik pengguna (`Chat`, `ChatHistory`, `Transaction`, `PromptUsage`) memakai `ON DELETE CASCADE` ke `User`, sehingga menghapus akun menghapus seluruh datanya. `SearchLog` dan `TrendingIssue` memakai relasi opsional.
- **Perubahan 16 Okt 2026:** tabel `PromptUsage` ditambahkan lewat `prisma/migrations/20261016000000_add_prompt_usage/migration.sql`. Migrasi ini hanya berisi `CREATE TABLE`, `INDEX`, `FOREIGN KEY`, dan backfill 2 hari terakhir, dan diverifikasi dengan `prisma migrate diff`. Database dibuat dengan `db push`, sehingga migrasi dijalankan dengan `prisma db execute`, bukan `migrate deploy`.

## 3.3 Implementasi Fitur AI

### 3.3.1 Deskripsi Umum Fitur AI

Fitur AI utama adalah chatbot hukum berbasis **RAG**. Model bahasa tidak dilatih ulang (tidak ada *fine-tuning*). Pengetahuan hukum diambil dari database dokumen pada saat bertanya, sehingga jawaban bisa ditelusuri ke sumbernya dan basis pengetahuan dapat diperbarui tanpa melatih model.

### 3.3.2 Dataset dan Sumber Data

| Aspek | Keterangan |
|---|---|
| Sumber | JDIH BPK (<https://peraturan.bpk.go.id/>), dikumpulkan dengan `scripts/scraper.js`, ditambah unggahan admin |
| Jumlah regulasi terdaftar | 5.000 (Ketenagakerjaan 1.688, Perdata 3.312) |
| Sudah diindeks ke Pinecone | 193 dokumen → **78.313 potongan teks** |
| Jenis dokumen | UU, PP, Perpres, Keppres, Permen, Perda, lampiran |

### 3.3.3 Pre-processing dan Feature Engineering

| Tahap | Proses | Konfigurasi |
|---|---|---|
| 1. Ekstraksi teks | PDF dipotong per 25 halaman, lalu dibaca dengan **LlamaParse** (OCR) | Jeda 5 dtk antarbagian, 3× percobaan |
| 2. Chunking | `RecursiveCharacterTextSplitter`; potongan < 15 karakter dibuang | 1.000 karakter, overlap 200 |
| 3. Embedding | **Voyage AI `voyage-law-2`** (khusus dokumen hukum) | 1.024 dimensi, batch 20, jeda 3 dtk |
| 4. Penyimpanan | Upsert ke **Pinecone** dengan ID deterministik `reg_<id>_chunk_<n>` | Metadata: `regulationId`, `title`, `category`, `text`, `page` (rentang 25 halaman) |
| 5. Penyaringan saat query | Potongan duplikat dan tabel OCR kosong dibuang; 5 potongan teratas tidak pernah dibuang | Di `app/api/chat/route.js` (`cleanMatches`) |

### 3.3.4 Model dan Arsitektur

```
Pertanyaan (+ preferensi gaya jawaban, + konteks personal)
  → embedding Voyage voyage-law-2 (cache LRU per server)
  → Pinecone topK 50 → penyaring noise (±39–50 potongan tersisa)
  → prompt sistem: aturan akurasi, format Markdown, sitasi nama dokumen lengkap,
    RINGKAS & LANGSUNG, + preferensi pengguna (whitelist)
  → LLM pilihan pengguna (Gemini: semua potongan; Groq: 20 teratas)
       └─ gagal sebelum menulis → model Gemini cadangan
  → streaming NDJSON ke browser → simpan riwayat + catat kuota
```

| Model | Penyedia | Mode Kilat | Mode Berpikir | Konteks | Kuota gratis |
|---|---|---|---|---|---|
| Gemini 3.5 Flash-Lite *(default)* | Google | tanpa thinking | thinking budget 1.024 token | ≤ 50 potongan | 500 request/hari, 15/menit |
| Gemini 3.6 Flash *(pengganti 2.5 Flash)* | Google | thinking level rendah | thinking aktif | ≤ 50 | 20 request/hari |
| Gemini 3.5 Flash | Google | thinking level rendah | thinking aktif | ≤ 50 | 20 request/hari |
| GPT-OSS 120B | Groq | reasoning effort *low* (disembunyikan) | reasoning effort *medium* (ditampilkan) | 20 teratas | 8.000 token/menit, 1.000 request/hari |
| Qwen 3.8 27B | Groq | reasoning *none* | reasoning effort *medium* (ditampilkan) | 20 teratas | 8.000 token/menit, 1.000 request/hari |

Gemini 2.5 Flash diganti karena Google menutupnya untuk project baru (`404 no longer available to new users`). Gemini 3.7 dan 3.8 Flash sudah diuji, tetapi selalu `503 high demand` di tier gratis.

### 3.3.5 Proses Training Model

Tidak ada pelatihan model. TanyaHukum memakai LLM siap pakai melalui API dan menyesuaikan perilakunya dengan **rekayasa prompt** (aturan wajib di `buildSystemPrompt`) serta **retrieval** dokumen. Pembaruan pengetahuan dilakukan dengan menambah dokumen ke Pinecone lewat skrip ingest.

### 3.3.6 Hasil Evaluasi Model (Testing)

Ringkasan (detail di 4.2.4):

| Model · Mode | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | Rata-rata |
|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | 1,000 | 0,931 | 0,829 | 0,771 | **0,883** |
| Gemini 3.5 Flash · Berpikir | 1,000 | 0,924 | 0,804 | 0,796 | 0,881 |
| Gemini 3.5 Flash-Lite · Kilat *(default)* | 0,986 | 0,914 | 0,787 | 0,789 | 0,869 |
| Qwen 3.8 · Kilat | 0,986 | 0,955 | 0,796 | 0,735 | 0,868 |
| GPT-OSS 120B · Berpikir | 0,956 | 0,930 | 0,762 | 0,646 | 0,823 |

### 3.3.7 Integrasi Model ke Sistem

- **Endpoint:** `POST /api/chat` dengan `stream: true` mengirim event NDJSON (`step`, `sources`, `model`, `thinking`, `text`, `done`, `error`). Frontend menampilkannya bertahap di panel Proses dan bubble jawaban.
- **Pemilihan model:** parameter `mode` (10 nilai) dipetakan ke penyedia, model, konfigurasi thinking/reasoning, dan batas konteks di `MODE_CONFIG`.
- **Ketahanan:** fallback ke model Gemini cadangan saat kuota habis, server sibuk, atau stream gagal dibaca, selama teks belum mulai ditulis. Gemini dipanggil tanpa retry otomatis (`maxRetries: 0`).
- **Pembatalan:** tombol Stop menutup stream, `AbortController` menghentikan request ke LLM, dan tidak ada yang disimpan. Kuota tetap dihitung bila AI sudah mulai menulis.
- **Efisiensi:** cache embedding (LRU), klien Pinecone/Voyage dipakai ulang, dan baca database dilakukan paralel.

---

# BAB IV Evaluasi

## 4.2 Evaluasi Internal

| Jenis pengujian | Alat | Jumlah | Hasil |
|---|---|---|---|
| Black box | Jest + mock Prisma & layanan eksternal | 232 kasus, 28 berkas | **232 lulus (100%)** |
| White box | Istanbul (`--coverage`), ESLint `complexity` | 40 handler API + middleware | Baris 85,2%, cabang 75,2%, fungsi 88,1%; CC rata-rata 10,2 |
| E2E browser | Playwright (Chromium) + skrip uji Stop | 8 + 1 kasus | **9 lulus** |
| Response time | `tests/PPL-II/scripts/e2e_response_time.mjs` | 7 model/mode × 2 pertanyaan | Default selesai rata-rata 4,5 dtk |
| Performa endpoint | `tests/performance/run-smoke.mjs` | 59 request | 0 error |
| Keamanan statis | `run-security-checks.mjs`, `npm audit` | 2 temuan statis, 37 advisory | Tidak ada temuan terbuka di jalur produksi |
| Evaluasi RAG | Ragas 0.2.15 | 10 pertanyaan × 5 model | Semua target terlampaui |

### 4.2.1 Black Box Testing

**Cara kerja.** Setiap handler API dipanggil langsung dengan request tiruan (`tests/utils/mockRequest.js`). Database (Prisma) dan layanan luar (Pinecone, Voyage, Gemini, Groq, Midtrans, email) diganti mock (`tests/utils/loadRouteWithMocks.js`), sehingga yang diuji adalah input → output (status code, isi respons, cookie, data yang disimpan) tanpa bergantung pada server atau kuota API. Kasus dirancang dengan partisi ekuivalen, nilai batas, uji negatif (tanpa login, data milik orang lain), dan uji serangan (injection, IDOR, SSRF, CSRF, prompt injection).

**Ringkasan hasil:**

| No | Kategori | Berkas | Kasus | Lulus | Gagal |
|---|---|---|---|---|---|
| 1 | Autentikasi (register, login, Google, lupa & reset password) | `forgot-password.test.js`, `google.test.js`, `login-trim.test.js`, `login.test.js`, `register.test.js`, `reset-password.test.js` | 33 | 33 | 0 |
| 2 | Chat AI (JSON, streaming, mode/model, fallback, Stop, kuota, hapus semua riwayat) | `chat-features.test.js`, `chat.test.js`, `processCache.test.js` | 54 | 54 | 0 |
| 3 | Pusat Data Hukum (daftar, detail, unduh, resolve sitasi, jumlah dilihat) | `download.test.js`, `regulations.test.js`, `resolve.test.js`, `view-count.test.js` | 25 | 25 | 0 |
| 4 | Pembayaran (checkout Midtrans) | `checkout.test.js` | 9 | 9 | 0 |
| 5 | Profil (lihat, ubah, upload foto, hapus akun) | `profile.test.js` | 13 | 13 | 0 |
| 6 | Utilitas (rate limit, preferensi gaya jawaban) | `chatPreferences.test.js`, `rateLimit.test.js` | 8 | 8 | 0 |
| 7 | Keamanan (IDOR, SSRF, JWT, injection, CSRF, admin, webhook, hardening) | `chat-idor.test.js`, `download-ssrf.test.js`, `hardening-extra.test.js`, `hardening.test.js`, `input-validation.test.js`, `middleware-admin.test.js`, `payment-checkout-idor.test.js`, `payment-webhook-bypass.test.js` | 66 | 66 | 0 |
| 8 | Penanganan error | `api-errors.test.js` | 12 | 12 | 0 |
| 9 | Integrasi alur (auth & pembayaran) | `auth-flow.test.js`, `payment-flow.test.js` | 12 | 12 | 0 |
| | **Total** | | **232** | **232** | **0** |

**Kasus uji baru versi 1.2 (28 kasus):** `TC-STOP-01` (Stop), `TC-GROQ-01..04` (model Groq), `TC-MODE-01..05` (mode Kilat/Berpikir), `TC-FALLBACK-01` (model cadangan), `TC-QUOTA-01..03` (kuota), `TC-DELALL-01..03` (hapus semua riwayat), `TC-RL-01..03` (rate limit), `TC-PREF-01..05` (preferensi & anti prompt injection), `TC-LOGIN-07..08` (password ber-spasi), `TC-ADMIN-QUOTA-01` (sisa kuota admin).

**Daftar lengkap kasus uji** (judul ditulis apa adanya dari kode; sebagian berbahasa Inggris dari test lama):

##### 1. Autentikasi (register, login, Google, lupa & reset password)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `forgot-password.test.js` | TC-FP-01: returns 200 with generic message for registered email | ✅ Lulus |
| 2 | `forgot-password.test.js` | TC-FP-02: returns same generic message for unregistered email (no user enumeration) | ✅ Lulus |
| 3 | `forgot-password.test.js` | TC-FP-03: returns 400 when email is missing | ✅ Lulus |
| 4 | `forgot-password.test.js` | TC-FP-04: returns 400 for invalid email format | ✅ Lulus |
| 5 | `forgot-password.test.js` | TC-FP-05: returns 429 after 3 requests from same IP within 15 min window | ✅ Lulus |
| 6 | `forgot-password.test.js` | TC-FP-06: saves hashed (not plain) reset token to database | ✅ Lulus |
| 7 | `google.test.js` | TC-GAUTH-01: logs in existing Google user and sets cookie | ✅ Lulus |
| 8 | `google.test.js` | TC-GAUTH-02: auto-registers new Google user with correct defaults | ✅ Lulus |
| 9 | `google.test.js` | TC-GAUTH-03: returns 400 when credentialToken is missing | ✅ Lulus |
| 10 | `google.test.js` | TC-GAUTH-04: returns 401 when Google token verification fails | ✅ Lulus |
| 11 | `login-trim.test.js` | TC-LOGIN-07: akun hasil registrasi (hash dari password ter-trim) bisa login dengan password yang sama persis seperti saat daftar | ✅ Lulus |
| 12 | `login-trim.test.js` | TC-LOGIN-08: password salah tetap ditolak (perbaikan tidak melonggarkan login) | ✅ Lulus |
| 13 | `login-trim.test.js` | TC-ADMIN-QUOTA-01: sisa kuota dihitung dari PromptUsage, bukan dari riwayat chat | ✅ Lulus |
| 14 | `login.test.js` | returns 400 on invalid body (non-json) | ✅ Lulus |
| 15 | `login.test.js` | returns 400 on invalid email format | ✅ Lulus |
| 16 | `login.test.js` | returns 401 when user not found | ✅ Lulus |
| 17 | `register.test.js` | TC-REG-01: returns 201 on successful registration | ✅ Lulus |
| 18 | `register.test.js` | TC-REG-02: returns 400 when email is missing | ✅ Lulus |
| 19 | `register.test.js` | TC-REG-03: returns 400 when password is missing | ✅ Lulus |
| 20 | `register.test.js` | TC-REG-04: returns 400 for invalid email format | ✅ Lulus |
| 21 | `register.test.js` | TC-REG-05: returns 400 when password shorter than 8 chars | ✅ Lulus |
| 22 | `register.test.js` | TC-REG-06: normalizes email to lowercase before saving | ✅ Lulus |
| 23 | `register.test.js` | TC-REG-07: returns 409 when email already registered | ✅ Lulus |
| 24 | `register.test.js` | TC-REG-08: returns 409 with Google hint when email registered via Google | ✅ Lulus |
| 25 | `register.test.js` | TC-REG-09: P2002 error from DB is handled (409 in prod; 500 in isolated test due to module boundary) | ✅ Lulus |
| 26 | `register.test.js` | TC-REG-10: handles SQL-injection-like email string without crash | ✅ Lulus |
| 27 | `reset-password.test.js` | TC-RP-01: returns 200 and clears token on valid reset | ✅ Lulus |
| 28 | `reset-password.test.js` | TC-RP-02: returns 400 when token is missing | ✅ Lulus |
| 29 | `reset-password.test.js` | TC-RP-03: returns 400 when newPassword is missing | ✅ Lulus |
| 30 | `reset-password.test.js` | TC-RP-04: returns 400 when password shorter than 8 chars | ✅ Lulus |
| 31 | `reset-password.test.js` | TC-RP-05: returns 400 when token is invalid (not found in DB) | ✅ Lulus |
| 32 | `reset-password.test.js` | TC-RP-06: filters token by expiry date in DB query (expired token rejected) | ✅ Lulus |
| 33 | `reset-password.test.js` | TC-RP-07: does not store plain-text password (passwordHash must change) | ✅ Lulus |

##### 2. Chat AI (JSON, streaming, mode/model, fallback, Stop, kuota, hapus semua riwayat)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `chat-features.test.js` | TC-STOP-01: stream dibatalkan klien → AI berhenti & tidak ada riwayat yang disimpan | ✅ Lulus |
| 2 | `chat-features.test.js` | TC-GROQ-01: GPT-OSS → konteks dibatasi 20 potongan, penalaran tampil sebagai thinking, jawaban tersimpan | ✅ Lulus |
| 3 | `chat-features.test.js` | TC-GROQ-02: batas token Groq terlampaui (413) → otomatis pindah ke Gemini | ✅ Lulus |
| 4 | `chat-features.test.js` | TC-GROQ-03: GROQ_API_KEY tidak diset → mode Groq langsung memakai Gemini (tidak memanggil Groq) | ✅ Lulus |
| 5 | `chat-features.test.js` | TC-GROQ-04: mode Kilat & Gemini 3.5 Flash memakai model yang benar | ✅ Lulus |
| 6 | `chat-features.test.js` | TC-DELALL-01: tanpa login → 401 | ✅ Lulus |
| 7 | `chat-features.test.js` | TC-DELALL-02: tanpa konfirmasi "HAPUS" → 400, tidak ada yang dihapus | ✅ Lulus |
| 8 | `chat-features.test.js` | TC-DELALL-03: [SECURITY] hanya menghapus chat milik user yang login | ✅ Lulus |
| 9 | `chat-features.test.js` | TC-MODE-01: Qwen Berpikir → reasoning_effort medium, penalaran dipisah & ditampilkan | ✅ Lulus |
| 10 | `chat-features.test.js` | TC-MODE-02: Qwen Kilat → reasoning_effort none | ✅ Lulus |
| 11 | `chat-features.test.js` | TC-MODE-03: GPT-OSS Kilat → effort low, penalaran singkat tidak ditampilkan | ✅ Lulus |
| 12 | `chat-features.test.js` | TC-MODE-04: Flash-Lite Berpikir & 3.5 Flash Kilat memakai konfigurasi thinking yang benar | ✅ Lulus |
| 13 | `chat-features.test.js` | TC-MODE-05: Gemini tanpa retry otomatis (maxRetries 0) agar fallback langsung jalan | ✅ Lulus |
| 14 | `chat-features.test.js` | TC-FALLBACK-01: stream Gemini gagal dibaca (gangguan sementara) sebelum menulis → pindah ke model cadangan | ✅ Lulus |
| 15 | `chat-features.test.js` | TC-QUOTA-01: [SECURITY] kuota dihitung dari PromptUsage → hapus riwayat tidak mengembalikan kuota | ✅ Lulus |
| 16 | `chat-features.test.js` | TC-QUOTA-02: jawaban selesai → pemakaian kuota dicatat | ✅ Lulus |
| 17 | `chat-features.test.js` | TC-QUOTA-03: Stop setelah AI menulis → kuota tetap terpakai, riwayat tidak disimpan | ✅ Lulus |
| 18 | `chat.test.js` | TC-CHAT-01: returns AI answer for valid PRO user request | ✅ Lulus |
| 19 | `chat.test.js` | TC-CHAT-02: returns 400 when message is empty string | ✅ Lulus |
| 20 | `chat.test.js` | TC-CHAT-03: returns 401 when no JWT session (not logged in) | ✅ Lulus |
| 21 | `chat.test.js` | TC-CHAT-04: returns 404 when userId from session does not exist in DB | ✅ Lulus |
| 22 | `chat.test.js` | TC-CHAT-05: returns 403 with limitReached flag when FREE user exceeds daily limit | ✅ Lulus |
| 23 | `chat.test.js` | TC-CHAT-06: PRO user bypasses prompt limit check | ✅ Lulus |
| 24 | `chat.test.js` | TC-CHAT-07: uses existing chatId when provided | ✅ Lulus |
| 25 | `chat.test.js` | TC-CHAT-20: [SECURITY] POST ke chatId milik user lain ditolak 404 sebelum AI dipanggil | ✅ Lulus |
| 26 | `chat.test.js` | TC-CHAT-21: pesan melebihi 5000 karakter ditolak 400 | ✅ Lulus |
| 27 | `chat.test.js` | TC-CHAT-23: jawaban AI selalu tersimpan setelah pertanyaan user (createdAt lebih besar) | ✅ Lulus |
| 28 | `chat.test.js` | TC-CHAT-24: riwayat diurutkan createdAt lalu role (USER sebelum AI jika timestamp kembar) | ✅ Lulus |
| 29 | `chat.test.js` | TC-CHAT-22: [SECURITY] GET pesan selalu di-scope ke userId sesi (tidak bisa baca chat orang lain) | ✅ Lulus |
| 30 | `chat.test.js` | TC-CHAT-08: [FIXED] GET tanpa JWT sekarang ditolak 401 (IDOR sudah ditutup) | ✅ Lulus |
| 31 | `chat.test.js` | TC-CHAT-09: returns 401 when userId param tidak cocok dengan session | ✅ Lulus |
| 32 | `chat.test.js` | TC-CHAT-10: returns chat list when userId cocok dengan session | ✅ Lulus |
| 33 | `chat.test.js` | TC-CHAT-11: returns messages for specific chatId | ✅ Lulus |
| 34 | `chat.test.js` | TC-CHAT-12: renames a chat successfully (user owns the chat) | ✅ Lulus |
| 35 | `chat.test.js` | TC-CHAT-13: returns 400 when chatId atau title tidak ada | ✅ Lulus |
| 36 | `chat.test.js` | TC-CHAT-14: [FIXED] PATCH tanpa login sekarang ditolak 401 | ✅ Lulus |
| 37 | `chat.test.js` | TC-CHAT-15: [FIXED] PATCH ditolak 403 jika chat bukan milik user | ✅ Lulus |
| 38 | `chat.test.js` | TC-CHAT-16: deletes a chat successfully (user owns chat) | ✅ Lulus |
| 39 | `chat.test.js` | TC-CHAT-17: returns 400 when chatId tidak ada | ✅ Lulus |
| 40 | `chat.test.js` | TC-CHAT-18: [FIXED] DELETE tanpa login sekarang ditolak 401 | ✅ Lulus |
| 41 | `chat.test.js` | TC-CHAT-19: [FIXED] DELETE ditolak 403 jika chat bukan milik user | ✅ Lulus |
| 42 | `chat.test.js` | TC-CHAT-25: mengirim tahap proses, dokumen, thinking, teks, lalu done — dan menyimpan jawaban utuh | ✅ Lulus |
| 43 | `chat.test.js` | TC-CHAT-28: Gemini 3.6 Flash · Kilat → thinking level rendah, tidak ada event thinking | ✅ Lulus |
| 44 | `chat.test.js` | TC-CHAT-29: mode tidak dikenal → default mendalam (thinking aktif) | ✅ Lulus |
| 45 | `chat.test.js` | TC-CHAT-30: kuota model utama habis → otomatis pakai model cadangan, jawaban tetap tersimpan | ✅ Lulus |
| 46 | `chat.test.js` | TC-CHAT-31: chunk sampah (duplikat & tabel kosong) disaring, 5 teratas tidak pernah dibuang | ✅ Lulus |
| 47 | `chat.test.js` | TC-CHAT-32: embedding pertanyaan yang sama di-cache (Voyage hanya dipanggil sekali) | ✅ Lulus |
| 48 | `chat.test.js` | TC-CHAT-33: prompt berisi aturan ringkas & aturan kutipan tetap ada | ✅ Lulus |
| 49 | `chat.test.js` | TC-CHAT-26: kuota Gemini habis saat streaming → event error, riwayat tidak disimpan | ✅ Lulus |
| 50 | `chat.test.js` | TC-CHAT-27: batas kuota harian tetap berlaku di mode streaming (403 JSON sebelum stream dimulai) | ✅ Lulus |
| 51 | `processCache.test.js` | TC-PC-01: proses yang disimpan bisa diambil lagi dengan chatId & jawaban yang sama | ✅ Lulus |
| 52 | `processCache.test.js` | TC-PC-02: jawaban berbeda / chat berbeda tidak tertukar | ✅ Lulus |
| 53 | `processCache.test.js` | TC-PC-03: hanya menyimpan maksimal 50 proses terbaru | ✅ Lulus |
| 54 | `processCache.test.js` | TC-PC-04: [PRIVASI] clearProcessCache menghapus semua proses (dipanggil saat logout) | ✅ Lulus |

##### 3. Pusat Data Hukum (daftar, detail, unduh, resolve sitasi, jumlah dilihat)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `download.test.js` | TC-DL-01: returns PDF buffer with correct headers for valid Supabase URL | ✅ Lulus |
| 2 | `download.test.js` | TC-DL-02: returns 400 when url param is missing | ✅ Lulus |
| 3 | `download.test.js` | TC-DL-03: returns upstream status code when Supabase file not found (404) | ✅ Lulus |
| 4 | `download.test.js` | TC-DL-04: returns 500 when fetch throws (network error) | ✅ Lulus |
| 5 | `download.test.js` | TC-DL-05: sanitizes filename — replaces path traversal slashes and special chars | ✅ Lulus |
| 6 | `download.test.js` | TC-DL-06: [FIXED] URL non-Supabase ditolak 400 — SSRF sudah diblok | ✅ Lulus |
| 7 | `regulations.test.js` | TC-REG-01: returns paginated list with meta on default request | ✅ Lulus |
| 8 | `regulations.test.js` | TC-REG-02: passes correct search where clause for title & description | ✅ Lulus |
| 9 | `regulations.test.js` | TC-REG-03: returns empty data array (not error) for search with no results | ✅ Lulus |
| 10 | `regulations.test.js` | TC-REG-04: applies category filter when category param is not "Semua" | ✅ Lulus |
| 11 | `regulations.test.js` | TC-REG-05: does NOT apply category filter when category is "Semua" | ✅ Lulus |
| 12 | `regulations.test.js` | TC-REG-06: calculates skip correctly for page > 1 | ✅ Lulus |
| 13 | `regulations.test.js` | TC-REG-07: always filters isActive=true for public endpoint | ✅ Lulus |
| 14 | `regulations.test.js` | TC-REG-08: logs search query to SearchLog when search param present | ✅ Lulus |
| 15 | `regulations.test.js` | TC-REG-10: [SECURITY] sortBy tidak dikenal diabaikan (fallback ke title) | ✅ Lulus |
| 16 | `regulations.test.js` | TC-REG-09: does NOT log search when search param is empty | ✅ Lulus |
| 17 | `resolve.test.js` | TC-RES-01: judul cocok (tanpa peduli huruf besar/kecil) → mengembalikan fileUrl | ✅ Lulus |
| 18 | `resolve.test.js` | TC-RES-05: judul tanpa awalan kategori tetap cocok (AI menulis "PERDA 10 TH 2023") | ✅ Lulus |
| 19 | `resolve.test.js` | TC-RES-06: kecocokan persis diutamakan di atas kecocokan akhiran | ✅ Lulus |
| 20 | `resolve.test.js` | TC-RES-02: [SECURITY] hanya dokumen aktif & field publik yang diambil | ✅ Lulus |
| 21 | `resolve.test.js` | TC-RES-03: [SECURITY] fileUrl berbahaya (javascript:) tidak dikembalikan | ✅ Lulus |
| 22 | `resolve.test.js` | TC-RES-04: [SECURITY] maksimal 20 judul per request, tanpa judul → tidak query DB | ✅ Lulus |
| 23 | `view-count.test.js` | TC-VIEW-01: GET detail dokumen increment viewCount (fire-and-forget) | ✅ Lulus |
| 24 | `view-count.test.js` | TC-VIEW-02: GET detail dokumen tetap return 200 meski update viewCount gagal | ✅ Lulus |
| 25 | `view-count.test.js` | TC-VIEW-03: GET dokumen tidak ada → 404, viewCount tidak diincrement | ✅ Lulus |

##### 4. Pembayaran (checkout Midtrans)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `checkout.test.js` | TC-PAY-01: returns snap token and redirect_url on success | ✅ Lulus |
| 2 | `checkout.test.js` | TC-PAY-02: creates PENDING transaction record before calling Midtrans | ✅ Lulus |
| 3 | `checkout.test.js` | TC-PAY-03: updates transaction with paymentUrl after Midtrans success | ✅ Lulus |
| 4 | `checkout.test.js` | TC-PAY-04: returns 401 when not logged in (no session) | ✅ Lulus |
| 5 | `checkout.test.js` | TC-PAY-05: returns 404 when user does not exist | ✅ Lulus |
| 6 | `checkout.test.js` | TC-PAY-06: generates unique orderId with timestamp prefix | ✅ Lulus |
| 7 | `checkout.test.js` | TC-PAY-07: [FIXED] user yang sudah PRO ditolak checkout — 400 | ✅ Lulus |
| 8 | `checkout.test.js` | TC-PAY-08: [SECURITY] userId di body yang beda dengan sesi ditolak 403 | ✅ Lulus |
| 9 | `checkout.test.js` | TC-PAY-09: returns 500 when Midtrans createTransaction throws | ✅ Lulus |

##### 5. Profil (lihat, ubah, upload foto, hapus akun)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `profile.test.js` | TC-PROF-01: returns user profile for authenticated request | ✅ Lulus |
| 2 | `profile.test.js` | TC-PROF-02: returns 401 when no token cookie present | ✅ Lulus |
| 3 | `profile.test.js` | TC-PROF-03: triggers self-healing tier sync when user is FREE with PENDING transaction | ✅ Lulus |
| 4 | `profile.test.js` | TC-PROF-04: updates name successfully | ✅ Lulus |
| 5 | `profile.test.js` | TC-PROF-05: returns 400 when no update fields provided | ✅ Lulus |
| 6 | `profile.test.js` | TC-PROF-06: returns 400 when avatarUrl does not start with http | ✅ Lulus |
| 7 | `profile.test.js` | TC-PROF-07: returns 400 when changing password without currentPassword | ✅ Lulus |
| 8 | `profile.test.js` | TC-PROF-08: returns 401 when currentPassword is wrong | ✅ Lulus |
| 9 | `profile.test.js` | TC-PROF-09: updates personalContext field | ✅ Lulus |
| 10 | `profile.test.js` | TC-PROF-12: [FIXED] personalContext > 500 karakter ditolak 400 | ✅ Lulus |
| 11 | `profile.test.js` | TC-PROF-13: personalContext tepat 500 karakter diterima | ✅ Lulus |
| 12 | `profile.test.js` | TC-PROF-10: deletes account and clears token cookie | ✅ Lulus |
| 13 | `profile.test.js` | TC-PROF-11: returns 401 when attempting delete without token | ✅ Lulus |

##### 6. Utilitas (rate limit, preferensi gaya jawaban)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `chatPreferences.test.js` | TC-PREF-01: hanya kunci & nilai dari whitelist yang diterima | ✅ Lulus |
| 2 | `chatPreferences.test.js` | TC-PREF-02: instruksi prompt dibuat dari teks yang sudah ditentukan, kosong bila semua default | ✅ Lulus |
| 3 | `chatPreferences.test.js` | TC-PREF-03: setiap opsi non-default punya instruksi prompt | ✅ Lulus |
| 4 | `chatPreferences.test.js` | TC-PREF-04: preferensi valid disisipkan ke prompt sistem | ✅ Lulus |
| 5 | `chatPreferences.test.js` | TC-PREF-05: [SECURITY] teks bebas di preferensi tidak masuk ke prompt (anti prompt injection) | ✅ Lulus |
| 6 | `rateLimit.test.js` | TC-RL-01: menolak request ke-(N+1) dalam satu menit | ✅ Lulus |
| 7 | `rateLimit.test.js` | TC-RL-02: bucket terpisah per scope & per pengguna | ✅ Lulus |
| 8 | `rateLimit.test.js` | TC-RL-03: [BUG FIX] jendela di-reset 1 menit sejak request pertama walau pengguna terus aktif | ✅ Lulus |

##### 7. Keamanan (IDOR, SSRF, JWT, injection, CSRF, admin, webhook, hardening)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `chat-idor.test.js` | SECURITY: [FIXED] GET chat list tanpa token sekarang ditolak 401 | ✅ Lulus |
| 2 | `chat-idor.test.js` | SECURITY: [FIXED] POST tanpa token sekarang ditolak 401 | ✅ Lulus |
| 3 | `download-ssrf.test.js` | S-SSRF-01: [FIXED] AWS metadata URL sekarang ditolak 400 | ✅ Lulus |
| 4 | `download-ssrf.test.js` | S-SSRF-02: [FIXED] URL localhost internal sekarang ditolak 400 | ✅ Lulus |
| 5 | `download-ssrf.test.js` | S-SSRF-03: [FIXED] URL non-Supabase (domain acak) sekarang ditolak 400 | ✅ Lulus |
| 6 | `download-ssrf.test.js` | S-SSRF-04: URL Supabase valid tetap bisa didownload | ✅ Lulus |
| 7 | `hardening-extra.test.js` | S-HDR-01: semua route mendapat header keamanan & X-Powered-By dimatikan | ✅ Lulus |
| 8 | `hardening-extra.test.js` | S-JWT-01: token ADMIN yang ditandatangani HS512 (bukan HS256) ditolak middleware | ✅ Lulus |
| 9 | `hardening-extra.test.js` | S-RL-01: login dibatasi per email walau IP berganti-ganti (11x → 429) | ✅ Lulus |
| 10 | `hardening-extra.test.js` | S-RL-02: kuota register dan login terpisah (register tidak menghabiskan kuota login) | ✅ Lulus |
| 11 | `hardening-extra.test.js` | S-RL-03: reset-password dibatasi per IP (11x → 429) | ✅ Lulus |
| 12 | `hardening-extra.test.js` | S-RL-04: chat dibatasi 15 pesan/menit per user (16x → 429) | ✅ Lulus |
| 13 | `hardening-extra.test.js` | S-GGL-02: email Google yang belum terverifikasi ditolak 403 | ✅ Lulus |
| 14 | `hardening-extra.test.js` | S-OUT-01: cookie sesi tetap dihapus walau Supabase error | ✅ Lulus |
| 15 | `hardening-extra.test.js` | S-PRF-01: email baru dinormalisasi (trim + lowercase) | ✅ Lulus |
| 16 | `hardening-extra.test.js` | S-PRF-02: email yang sudah dipakai akun lain → 409 (bukan 401) | ✅ Lulus |
| 17 | `hardening-extra.test.js` | S-PRF-03: akun Google (tanpa password) ganti password → 400 jelas, bukan crash | ✅ Lulus |
| 18 | `hardening-extra.test.js` | S-PRF-04: email format salah & personalContext bukan string ditolak 400 | ✅ Lulus |
| 19 | `hardening-extra.test.js` | S-UPL-01: avatar berlabel PNG tapi isinya bukan gambar ditolak 400 | ✅ Lulus |
| 20 | `hardening-extra.test.js` | S-UPL-02: avatar PNG asli tetap bisa diupload | ✅ Lulus |
| 21 | `hardening-extra.test.js` | S-UPL-03: dokumen admin berlabel PDF tapi isinya bukan PDF ditolak 400 | ✅ Lulus |
| 22 | `hardening-extra.test.js` | S-UPL-04: dokumen PDF asli tetap bisa diupload admin | ✅ Lulus |
| 23 | `hardening-extra.test.js` | S-CHT-01: rename judul chat > 200 karakter ditolak 400 | ✅ Lulus |
| 24 | `hardening-extra.test.js` | S-MAIL-01: SMTP port 587 wajib STARTTLS (requireTLS) | ✅ Lulus |
| 25 | `hardening-extra.test.js` | S-MID-01: Midtrans default sandbox; production hanya jika env MIDTRANS_IS_PRODUCTION=true | ✅ Lulus |
| 26 | `hardening-extra.test.js` | S-DSH-01: isu terkini di dashboard user tidak menyertakan createdBy (ID akun admin) | ✅ Lulus |
| 27 | `hardening.test.js` | S-ADM-01: tanpa sesi → 401, DB tidak disentuh | ✅ Lulus |
| 28 | `hardening.test.js` | S-ADM-02: token lama berisi role ADMIN tapi di DB sudah USER → 403 | ✅ Lulus |
| 29 | `hardening.test.js` | S-ADM-03: admin valid tetap bisa akses | ✅ Lulus |
| 30 | `hardening.test.js` | S-ADM-04: respons create user tidak membawa passwordHash/resetToken | ✅ Lulus |
| 31 | `hardening.test.js` | S-ADM-05: newsLink javascript: ditolak, link tanpa skema dilengkapi https:// | ✅ Lulus |
| 32 | `hardening.test.js` | S-WH-01: server key tidak pernah tercetak di log | ✅ Lulus |
| 33 | `hardening.test.js` | S-WH-02: production + server key kosong → 500 (fail-closed) | ✅ Lulus |
| 34 | `hardening.test.js` | S-WH-03: nominal dibayar tidak sama dengan nominal transaksi → ditolak | ✅ Lulus |
| 35 | `hardening.test.js` | S-WH-04: GET health check tidak menampilkan potongan server key | ✅ Lulus |
| 36 | `hardening.test.js` | S-DL-01: URL http (non-HTTPS) ditolak | ✅ Lulus |
| 37 | `hardening.test.js` | S-DL-02: fetch tidak mengikuti redirect | ✅ Lulus |
| 38 | `hardening.test.js` | S-FP-01: resetUrl tidak pernah dikembalikan di luar development | ✅ Lulus |
| 39 | `hardening.test.js` | S-CSRF-01: POST API dari origin lain ditolak 403 | ✅ Lulus |
| 40 | `hardening.test.js` | S-CSRF-02: POST API dari origin sendiri & webhook tanpa Origin tetap lolos | ✅ Lulus |
| 41 | `hardening.test.js` | S-ADMPAGE-01: halaman /admin tanpa token admin di-redirect ke /chatbot | ✅ Lulus |
| 42 | `hardening.test.js` | S-USR-01: role "AI" atau tier tidak dikenal ditolak 400 | ✅ Lulus |
| 43 | `hardening.test.js` | S-USR-02: admin tidak bisa menghapus / menurunkan role dirinya sendiri | ✅ Lulus |
| 44 | `hardening.test.js` | S-REG-01: dokumen nonaktif → 404 dan query tidak mengambil `content` | ✅ Lulus |
| 45 | `hardening.test.js` | S-REG-02: spam view count dari IP yang sama tidak dihitung, respons tetap 200 | ✅ Lulus |
| 46 | `hardening.test.js` | S-GGL-01: GOOGLE_CLIENT_ID kosong → 500 (fail-closed, audience tidak dilewati) | ✅ Lulus |
| 47 | `input-validation.test.js` | S-INJ-01: login rejects SQL-like email before reaching DB | ✅ Lulus |
| 48 | `input-validation.test.js` | S-INJ-02: login rejects OR-based injection email | ✅ Lulus |
| 49 | `input-validation.test.js` | S-INJ-03: register rejects SQL injection in email field | ✅ Lulus |
| 50 | `input-validation.test.js` | S-XSS-01: chat API stores XSS payload in DB (stored XSS risk — needs output sanitization) | ✅ Lulus |
| 51 | `input-validation.test.js` | S-XSS-02: profile name update accepts HTML but response is JSON (not rendered server-side) | ✅ Lulus |
| 52 | `input-validation.test.js` | S-OVS-01: chat API handles extremely long message without crash | ✅ Lulus |
| 53 | `input-validation.test.js` | S-OVS-02: regulations search handles special characters without crash | ✅ Lulus |
| 54 | `input-validation.test.js` | S-OVS-03: register handles Unicode emoji in password | ✅ Lulus |
| 55 | `input-validation.test.js` | S-AUTH-01: middleware blocks expired JWT token | ✅ Lulus |
| 56 | `input-validation.test.js` | S-AUTH-02: middleware blocks token signed with wrong secret | ✅ Lulus |
| 57 | `input-validation.test.js` | S-AUTH-03: [FIXED] JWT_SECRET tidak di-set → middleware return 500, bukan bisa diforge | ✅ Lulus |
| 58 | `input-validation.test.js` | S-AUTH-04: [FIXED] /api/dashboard sekarang butuh login — tanpa token ditolak 401 | ✅ Lulus |
| 59 | `middleware-admin.test.js` | blocks /api/admin/* without token | ✅ Lulus |
| 60 | `middleware-admin.test.js` | blocks /api/admin/* when role is not ADMIN | ✅ Lulus |
| 61 | `middleware-admin.test.js` | SECURITY: [FIXED] JWT_SECRET missing → middleware return 500 (fail-closed, token forgery tidak bisa) | ✅ Lulus |
| 62 | `payment-checkout-idor.test.js` | SECURITY: [FIXED] tanpa sesi login ditolak 401 walau body berisi userId korban | ✅ Lulus |
| 63 | `payment-checkout-idor.test.js` | SECURITY: [FIXED] user login tidak bisa checkout atas nama user lain (403) | ✅ Lulus |
| 64 | `payment-checkout-idor.test.js` | checkout untuk diri sendiri tetap berjalan normal | ✅ Lulus |
| 65 | `payment-webhook-bypass.test.js` | SECURITY: sandbox bypass processes even with invalid signature when not production | ✅ Lulus |
| 66 | `hardening.test.js` | S-PAGE-01: /dashboard dan /pusat-data tanpa login di-redirect ke /chatbot, /chatbot tetap terbuka | ✅ Lulus |

##### 8. Penanganan error

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `api-errors.test.js` | TC-ERR-01: login returns 500 when DB throws unexpected error | ✅ Lulus |
| 2 | `api-errors.test.js` | TC-ERR-02: register returns 500 when DB create fails unexpectedly | ✅ Lulus |
| 3 | `api-errors.test.js` | TC-ERR-03: regulations returns 500 when DB throws | ✅ Lulus |
| 4 | `api-errors.test.js` | TC-ERR-04: payment webhook returns 500 when DB transaction update fails | ✅ Lulus |
| 5 | `api-errors.test.js` | TC-ERR-05: chat returns 500 when Pinecone query fails | ✅ Lulus |
| 6 | `api-errors.test.js` | TC-ERR-06: chat returns 429 when Gemini API quota exceeded | ✅ Lulus |
| 7 | `api-errors.test.js` | TC-ERR-07: chat returns 404 when chatId provided but not found in DB | ✅ Lulus |
| 8 | `api-errors.test.js` | TC-ERR-08: login returns 400 for non-JSON body | ✅ Lulus |
| 9 | `api-errors.test.js` | TC-ERR-09: regulations handles NaN page parameter gracefully | ✅ Lulus |
| 10 | `api-errors.test.js` | TC-ERR-10: chat POST handles empty body (no JSON fields) | ✅ Lulus |
| 11 | `api-errors.test.js` | TC-ERR-11: forgot-password handles missing body fields gracefully | ✅ Lulus |
| 12 | `api-errors.test.js` | TC-ERR-12: payment checkout returns 500 when Midtrans is unreachable | ✅ Lulus |

##### 9. Integrasi alur (auth & pembayaran)

| No | Berkas | Skenario (judul test) | Status |
|---|---|---|---|
| 1 | `auth-flow.test.js` | TC-INT-AUTH-01: full register → login → access profile cycle | ✅ Lulus |
| 2 | `auth-flow.test.js` | TC-INT-AUTH-02: cannot login with wrong password after registration | ✅ Lulus |
| 3 | `auth-flow.test.js` | TC-INT-AUTH-03: rate limit blocks 6th login attempt from same IP | ✅ Lulus |
| 4 | `auth-flow.test.js` | TC-INT-AUTH-04: forgot password → reset password full cycle | ✅ Lulus |
| 5 | `auth-flow.test.js` | TC-INT-AUTH-05: regular USER token cannot access /api/admin/* endpoints | ✅ Lulus |
| 6 | `auth-flow.test.js` | TC-INT-AUTH-06: ADMIN token can access /api/admin/* endpoints | ✅ Lulus |
| 7 | `payment-flow.test.js` | TC-INT-PAY-01: settlement webhook upgrades user to PRO (simulates post-checkout state) | ✅ Lulus |
| 8 | `payment-flow.test.js` | TC-INT-PAY-02: webhook idempotency — already-SUCCESS order is not reprocessed | ✅ Lulus |
| 9 | `payment-flow.test.js` | TC-INT-PAY-03: failed payment sets transaction status to FAILED | ✅ Lulus |
| 10 | `payment-flow.test.js` | TC-INT-PAY-04: fraud_status=challenge keeps payment as PENDING | ✅ Lulus |
| 11 | `payment-flow.test.js` | TC-INT-PAY-05: webhook returns 404 when order not found in database | ✅ Lulus |
| 12 | `payment-flow.test.js` | TC-INT-PAY-06: production mode rejects webhook with invalid signature | ✅ Lulus |

### 4.2.2 White Box Testing

**Cara kerja.**
1. **Statement & branch coverage:** saat 232 test dijalankan, Istanbul mencatat baris, pernyataan, cabang (`if/else`, `?:`, `&&`, `??`), dan fungsi yang dieksekusi.
2. **Kompleksitas siklomatik (McCabe):** CC = jumlah titik keputusan + 1, dihitung otomatis dengan aturan ESLint `complexity` per handler. Aturan ini juga menghitung `?.`, `??`, dan nilai default, sehingga angkanya lebih tinggi daripada hitungan manual di laporan Mei 2026.
3. **Inspeksi kode & uji jalur:** jalur kritis (fallback model, pembatalan stream, kuota, rate limit, preferensi) dibaca baris per baris lalu dibuatkan test yang memaksa jalur itu dijalankan.

| CC | Interpretasi |
|---|---|
| 1–4 | Sederhana |
| 5–10 | Moderat |
| 11–20 | Kompleks |
| > 20 | Sangat kompleks: disarankan dipecah |

**Coverage per berkas:**

| Berkas | Baris | Pernyataan | Cabang | Fungsi | Cabang tercover |
|---|---|---|---|---|---|
| `app/api/admin/regulations/upload/route.js` | 77,14% | 75,67% | 57,14% | 100% | 8/14 |
| `app/api/admin/trending/route.js` | 60% | 55,55% | 66,66% | 50% | 12/18 |
| `app/api/admin/users/[id]/route.js` | 52,08% | 50% | 35,71% | 100% | 15/42 |
| `app/api/admin/users/route.js` | 73,68% | 73,17% | 69,23% | 100% | 18/26 |
| `app/api/auth/forgot-password/route.js` | 89,36% | 87,5% | 81,48% | 66,66% | 22/27 |
| `app/api/auth/google/route.js` | 94,11% | 94,28% | 75% | 100% | 12/16 |
| `app/api/auth/login/route.js` | 95,34% | 95,34% | 83,33% | 100% | 30/36 |
| `app/api/auth/register/route.js` | 93,75% | 93,75% | 85,71% | 100% | 18/21 |
| `app/api/auth/reset-password/route.js` | 88% | 88% | 92,85% | 100% | 13/14 |
| `app/api/chat/history/route.js` | 83,33% | 78,94% | 83,33% | 50% | 5/6 |
| `app/api/chat/route.js` | 92,3% | 89,72% | 80,68% | 100% | 188/233 |
| `app/api/dashboard/route.js` | 78,94% | 76,92% | 35,71% | 25% | 5/14 |
| `app/api/logout/route.js` | 78,57% | 78,57% | 0% | 100% | 0/2 |
| `app/api/payment/checkout/route.js` | 100% | 96,55% | 100% | 50% | 10/10 |
| `app/api/payment/webhook/route.js` | 98,07% | 96,29% | 84,61% | 100% | 33/39 |
| `app/api/profile/route.js` | 79,34% | 79,56% | 73,01% | 100% | 46/63 |
| `app/api/profile/upload/route.js` | 76,92% | 72,72% | 55,88% | 100% | 19/34 |
| `app/api/regulations/[id]/route.js` | 79,31% | 79,31% | 75% | 100% | 9/12 |
| `app/api/regulations/download/route.js` | 90,32% | 90,32% | 90,9% | 100% | 20/22 |
| `app/api/regulations/resolve/route.js` | 89,28% | 90,32% | 90% | 100% | 9/10 |
| `app/api/regulations/route.js` | 96,87% | 96,87% | 89,65% | 50% | 26/29 |
| `lib/auth.js` | 50% | 46,66% | 0% | 100% | 0/2 |
| `lib/chatPreferences.js` | 73,07% | 77,14% | 87,5% | 75% | 14/16 |
| `lib/email.js` | 18,75% | 18,75% | 6,25% | 0% | 1/16 |
| `lib/rateLimit.js` | 100% | 100% | 77,77% | 100% | 7/9 |
| `lib/security.js` | 91,17% | 82,92% | 72,97% | 100% | 27/37 |
| `middleware.js` | 96,42% | 95,16% | 97,5% | 100% | 39/40 |
| `src/lib/auth-server.js` | 75% | 75% | 100% | 50% | 0/0 |
| `src/lib/processCache.js` | 95,45% | 89,28% | 80% | 100% | 12/15 |
| **Total** | **85,23%** | **83,56%** | **75,2%** | **88,05%** | **637/847** |

**Kompleksitas siklomatik per handler:**

| No | Modul | Handler | CC | Interpretasi |
|---|---|---|---|---|
| 1 | `middleware.js` | middleware | 14 | Kompleks |
| 2 | `app/api/admin/dashboard/stats/route.js` | GET | 7 | Moderat |
| 3 | `app/api/admin/regulations/route.js` | GET | 9 | Moderat |
| 4 | `app/api/admin/regulations/route.js` | POST | 8 | Moderat |
| 5 | `app/api/admin/regulations/upload/route.js` | POST | 10 | Moderat |
| 6 | `app/api/admin/regulations/[id]/route.js` | DELETE | 3 | Sederhana |
| 7 | `app/api/admin/regulations/[id]/route.js` | PATCH | 7 | Moderat |
| 8 | `app/api/admin/search-logs/route.js` | GET | 3 | Sederhana |
| 9 | `app/api/admin/search-logs/route.js` | POST | 7 | Moderat |
| 10 | `app/api/admin/trending/route.js` | GET | 3 | Sederhana |
| 11 | `app/api/admin/trending/route.js` | POST | 10 | Moderat |
| 12 | `app/api/admin/trending/[id]/route.js` | DELETE | 3 | Sederhana |
| 13 | `app/api/admin/trending/[id]/route.js` | PATCH | 9 | Moderat |
| 14 | `app/api/admin/users/route.js` | GET | 3 | Sederhana |
| 15 | `app/api/admin/users/route.js` | POST | 14 | Kompleks |
| 16 | `app/api/admin/users/[id]/route.js` | DELETE | 8 | Moderat |
| 17 | `app/api/admin/users/[id]/route.js` | PATCH | 18 | Kompleks |
| 18 | `app/api/auth/forgot-password/route.js` | POST | 16 | Kompleks |
| 19 | `app/api/auth/google/route.js` | POST | 11 | Kompleks |
| 20 | `app/api/auth/login/route.js` | POST | 19 | Kompleks |
| 21 | `app/api/auth/register/route.js` | POST | 17 | Kompleks |
| 22 | `app/api/auth/reset-password/route.js` | POST | 9 | Moderat |
| 23 | `app/api/chat/history/route.js` | DELETE | 8 | Moderat |
| 24 | `app/api/chat/route.js` | POST | 25 | Sangat kompleks ⚠️ |
| 25 | `app/api/chat/route.js` | GET | 7 | Moderat |
| 26 | `app/api/chat/route.js` | PATCH | 9 | Moderat |
| 27 | `app/api/chat/route.js` | DELETE | 6 | Moderat |
| 28 | `app/api/dashboard/route.js` | GET | 7 | Moderat |
| 29 | `app/api/logout/route.js` | POST | 4 | Sederhana |
| 30 | `app/api/payment/checkout/route.js` | POST | 9 | Moderat |
| 31 | `app/api/payment/webhook/route.js` | GET | 2 | Sederhana |
| 32 | `app/api/payment/webhook/route.js` | POST | 19 | Kompleks |
| 33 | `app/api/profile/route.js` | GET | 12 | Kompleks |
| 34 | `app/api/profile/route.js` | PATCH | 27 | Sangat kompleks ⚠️ |
| 35 | `app/api/profile/route.js` | DELETE | 4 | Sederhana |
| 36 | `app/api/profile/upload/route.js` | POST | 16 | Kompleks |
| 37 | `app/api/regulations/download/route.js` | GET | 17 | Kompleks |
| 38 | `app/api/regulations/resolve/route.js` | GET | 8 | Moderat |
| 39 | `app/api/regulations/route.js` | GET | 20 | Kompleks |
| 40 | `app/api/regulations/[id]/route.js` | GET | 6 | Moderat |
| 41 | `app/api/regulations/[id]/route.js` | PATCH | 4 | Sederhana |
| | **Rata-rata 41 fungsi (40 handler API + middleware)** | | **10,2** | Kompleks |

**Analisis.**
- **Modul inti teruji dengan baik:** `api/chat` (92% baris), autentikasi (88–95% baris), `payment/checkout` (100%), dan `middleware.js` (96% baris, 98% cabang).
- **Coverage rendah:** endpoint admin (cabang 36–67%), `lib/email.js`, dan `api/logout`. Ini prioritas penambahan test berikutnya.
- **Modul paling kompleks:** `PATCH /api/profile` (CC 27) dan `POST /api/chat` beserta fungsi stream-nya (CC 25). Disarankan dipecah menjadi fungsi validasi, logika bisnis, dan penyimpanan.

### 4.2.3 Pengujian Non-Fungsional

#### a. Response time

**Cara:** skrip mengirim 2 pertanyaan nyata ke `POST /api/chat` (server lokal, akun uji, chat langsung dihapus). Q1 adalah pertanyaan spesifik (batas PKWT) dan Q2 pertanyaan luas (hak istirahat dan cuti tahunan). Waktu dicatat dari event streaming. Jeda antarpertanyaan ≥ 21 dtk karena batas Voyage 3 request/menit.

**Uji faktor terisolasi:**

| Faktor | Hasil |
|---|---|
| Batas Voyage gratis | Panggilan 1–3: 0,46–0,97 dtk; panggilan ke-4 dalam 1 menit gagal setelah ±40 dtk (7× HTTP 429); ke-5: 22,8 dtk |
| Node.js vs Python (query Pinecone) | Node: 1,46 dtk (koneksi baru), lalu ±0,33 dtk; Python: 1,22 dtk, lalu ±0,33 dtk. Tidak ada perbedaan berarti |
| Thinking & ukuran konteks (Gemini 2.5 Flash, token pertama) | 50 potongan + thinking 3,5 dtk; 10 + thinking 3,6 dtk; 10 tanpa thinking **1,1 dtk**; 50 tanpa thinking 1,7 dtk |
| Model Groq (15 potongan, token pertama) | GPT-OSS 120B 0,85 dtk; GPT-OSS 20B 0,75 dtk; Qwen 0,39 dtk |
| Latensi jaringan (TCP RTT) | Vercel 22 ms, Google 38 ms, Voyage 39 ms, Supabase 40 ms, Pinecone 285 ms |

**Baseline vs sesudah optimasi** (model dan mode sama, Gemini 2.5 Flash · Berpikir):

| Pertanyaan | Versi | Teks pertama | Selesai | Kata |
|---|---|---|---|---|
| Q1 PKWT | Lama | 6,9 dtk | 8,3 dtk | — |
| Q1 PKWT | Baru | 5,6 dtk | 6,9 dtk | 121 |
| Q2 Cuti tahunan | Lama | 24,6 dtk | 30,8 dtk | 596 |
| Q2 Cuti tahunan | Baru | 16,8 dtk | 21,8 dtk | 461 |

Penurunan 17–19% untuk Q1 dan 29–32% untuk Q2.

**Per model/mode** (format: cari / teks pertama / selesai dalam dtk / jumlah kata):

| Model · Mode | Q1 PKWT | Q2 Cuti | Rata-rata selesai |
|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat *(default)* | 2,0 / 3,7 / 5,3 / 155 | 0,4 / 1,5 / 3,7 / 239 | **4,5 dtk** |
| Qwen 3.8 · Kilat | 1,8 / 2,8 / 4,6 / 173 | 1,9 / 3,5 / 5,7 / 192 | 5,2 dtk |
| GPT-OSS 120B · Berpikir | 2,0 / 3,7 / 5,1 / 102 | 1,6 / 3,3 / 5,3 / 199 | 5,2 dtk |
| Gemini 3.6 Flash · Kilat | 2,3 / 9,3 / 11,8 / 157 | 2,6 / 10,1 / 13,7 / 244 | 12,8 dtk |
| Gemini 3.5 Flash · Berpikir | 1,9 / 10,4 / 13,0 / 169 | 1,6 / 12,1 / 15,3 / 236 | 14,2 dtk |
| Gemini 3.6 Flash · Berpikir | 1,9 / 10,0 / 12,8 / 205 | 1,9 / 13,8 / 17,3 / 265 | 15,1 dtk |
| *Gemini 2.5 Flash · Kilat (sudah diganti)* | *4,7 / 6,9 / 9,2 / 133* | *2,6 / 4,0 / 8,1 / 332* | *8,7 dtk* |
| *Gemini 2.5 Flash · Berpikir (sudah diganti)* | *1,9 / 5,6 / 6,9 / 121* | *1,6 / 16,8 / 21,8 / 461* | *14,4 dtk* |
| *Versi lama (sebelum optimasi)* | | | *19,6 dtk* |

**Urutan faktor penyebab lambat:** (1) batas Voyage gratis, +20–40 dtk; (2) proses berpikir, +2,5 hingga +13–22 dtk; (3) panjang jawaban; (4) koneksi pertama, ±1,2–1,5 dtk; (5) ukuran konteks, +0,2–1 dtk; (6) baca database berurutan, ±0,45 dtk (sudah diparalelkan); (7) latensi Pinecone, 285 ms; (8) bahasa server, ≈ 0.

**Optimasi yang diterapkan:** pilihan model/mode, aturan prompt "RINGKAS & LANGSUNG", penyaring potongan noise, cache embedding, klien Pinecone/Voyage dipakai ulang, baca database paralel, fallback tanpa retry, dan tombol Stop.

#### b. Performa endpoint

| Endpoint | Request | Error | Status | p50 | p95 |
|---|---|---|---|---|---|
| `GET /api/dashboard` (tanpa login) | 26 | 0 | 401 (sesuai harapan) | 87 ms | 165 ms |
| `GET /api/regulations` | 17 | 0 | 200 | 626 ms | 1.383 ms |
| `GET /api/payment/webhook` (health) | 16 | 0 | 200 | 22 ms | 603 ms |

Diukur di server *development* (kompilasi on-demand), dengan 10 request bersamaan.

#### c. E2E browser (Playwright) & uji Stop

| ID | Skenario | Hasil yang diharapkan | Status |
|---|---|---|---|
| TC-E2E-01 | Buka halaman utama | Halaman termuat | ✅ |
| TC-E2E-02 | Pemilih model di chat | Default Flash-Lite · Kilat; 5 model di atas, 2 mode di bawah; pilih Qwen lalu Berpikir; pilihan tersimpan setelah reload | ✅ |
| TC-E2E-03 | Menu model di 1280×720 | Menu di dalam layar; bagian Mode terlihat tanpa scroll | ✅ |
| TC-E2E-04 | Menu model di HP 390×844 | Menu di dalam layar | ✅ |
| TC-E2E-05 | Uji Stop end-to-end | Stop pada 3,9 dtk; pesan tersimpan 0 → 0 | ✅ |
| TC-E2E-06 | Kebijakan Privasi | 13 bagian dan 7 FAQ tampil; FAQ bisa dibuka; ganti bahasa ID ↔ EN; pilihan bahasa diingat | ✅ |
| TC-E2E-07 | Syarat & Ketentuan | 15 bagian dan 8 FAQ tampil; FAQ bisa dibuka; ganti bahasa ID ↔ EN | ✅ |
| TC-E2E-08 | Halaman legal di HP tanpa login | Terbuka publik, tanpa scroll horizontal | ✅ |
| TC-E2E-09 | Profil › Akun › Dokumen legal | Tautan membuka tab baru ke halaman yang benar | ✅ |

#### d. Uji langsung preferensi gaya jawaban

| Preferensi | Jawaban (Qwen 3.8, pertanyaan "Berapa lama maksimal PKWT?") |
|---|---|
| Default | Bahasa Indonesia, 172 kata, dengan sitasi |
| Bahasa jawaban: English + Panjang: Ringkas | Bahasa Inggris, 61 kata, sitasi tetap ada |

#### e. Keamanan statis

| Temuan | Status | Penjelasan |
|---|---|---|
| S2: bypass signature webhook di non-production | Diterima (by design) | Hanya aktif jika `NODE_ENV ≠ production` (uji sandbox lokal); di Vercel signature selalu wajib valid. |
| S3: dua library JWT | Dimitigasi | `jose` dan `jsonwebtoken` dikunci ke HS256 dengan secret yang sama. |
| `npm audit`: 37 advisory (1 kritis, 13 tinggi, 23 sedang) | Dipantau | Hampir semuanya dependency pengembangan (jest, tailwind, eslint, prisma CLI). `nodemailer`: opsi `raw` yang rentan tidak dipakai. Perbaikan butuh upgrade major, jadi ditunda. |

#### f. Ketersediaan & kuota tier gratis

| Layanan | Batas terukur | Penanganan |
|---|---|---|
| Gemini Flash-Lite | 15 request/menit, 500/hari per project | Default; cadangan untuk model lain |
| Gemini 3.6 / 3.5 Flash | 20 request/hari per project | Jika habis → otomatis Flash-Lite |
| Groq (GPT-OSS, Qwen) | 8.000 token/menit, 1.000 request/hari | Konteks 20 potongan; jika ditolak → Gemini |
| Voyage AI | 3 request/menit | Cache embedding per server |

### 4.2.4 Evaluasi Sistem RAG (Ragas)

**Cara kerja.**
1. **Dataset:** 10 pertanyaan baru (5 ketenagakerjaan, 5 perdata; easy/medium/hard) dari dokumen yang dipastikan ada di Pinecone. Jawaban acuan ditulis dari teks pasal aslinya (`tests/PPL-II/ragas/test_questions_v3.json`).
2. **Jawaban:** diambil dari **API aplikasi asli** (`POST /api/chat`) untuk 5 model final, sehingga prompt, penyaringan, dan konfigurasi model sama dengan yang dipakai pengguna. Jawaban yang jatuh ke model cadangan atau error tidak dinilai, dan pertanyaannya diulang.
3. **Konteks:** diambil ulang dengan langkah retrieval yang sama dengan server (Voyage → Pinecone topK 50 → penyaring).
4. **Penilaian:** Ragas 0.2.15 dengan juri Gemini 3.5 Flash-Lite (temperature 0) dan embedding `gemini-embedding-001`. Total 331 penilaian, 0 gagal. Waktu evaluasi ±1,5 jam karena batas 15 request/menit.

**Metrik dan target:**

| Kelompok | Metrik | Yang diukur | Target |
|---|---|---|---|
| Generasi | Faithfulness | Proporsi klaim jawaban yang didukung konteks (anti-halusinasi) | ≥ 0,70 |
| Generasi | Answer Relevancy | Fokus jawaban terhadap pertanyaan | ≥ 0,55 |
| Generasi | Answer Correctness | Kebenaran jawaban dibanding acuan (faktual + semantik) | ≥ 0,52 |
| Generasi | Factual Correctness | F1 klaim faktual jawaban vs acuan | ≥ 0,50 |
| Non-LLM | ROUGE-L | Kesamaan urutan kata dengan acuan | ≥ 0,25 |
| Non-LLM | BLEU | Kesamaan frasa (n-gram) dengan acuan | ≥ 0,10 |
| Non-LLM | String Similarity | Kemiripan karakter (Levenshtein) | ≥ 0,22 |
| Retrieval | Context Precision@10 | Potongan relevan berada di peringkat atas | ≥ 0,60 |
| Retrieval | Context Recall | Informasi acuan ada di konteks yang dibaca model | ≥ 0,60 |

#### a. Dataset pertanyaan uji

| ID | Domain | Tingkat | Sumber | Pertanyaan |
|---|---|---|---|---|
| naker_101 | Ketenagakerjaan | easy | Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023 (Pasal 39) | Menurut Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023, berapa lama paling lama PKWT berdasarkan jangka waktu dapat dibuat dan bagaimana ketentuan perpanjangannya? |
| naker_102 | Ketenagakerjaan | medium | Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023 (perlindungan pekerja perempuan) | Apa saja kewajiban pengusaha yang mempekerjakan pekerja/buruh perempuan antara pukul 23.00 sampai dengan 07.00 menurut Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023? |
| naker_103 | Ketenagakerjaan | medium | Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023 (perlindungan pekerja perempuan) | Apa saja hak pekerja/buruh perempuan terkait haid, melahirkan, dan menyusui, serta larangan pemutusan hubungan kerja terhadap mereka menurut Peraturan Daerah Kota Salatiga Nomor 9 Tahun 2023? |
| naker_104 | Ketenagakerjaan | easy | Peraturan Pemerintah Nomor 8 Tahun 2005 (Pasal 2-4, 19, 21) | Siapa yang membentuk LKS Tripartit Nasional, apa tugasnya, dan dari unsur apa saja keanggotaannya menurut PP Nomor 8 Tahun 2005? |
| naker_105 | Ketenagakerjaan | hard | Peraturan Daerah Nomor 6 Tahun 2023 tentang Pelayanan Ketenagakerjaan | Berapa ketentuan waktu kerja normal, berapa batas waktu kerja lembur, dan apa syarat serta kewajiban pengusaha yang mempekerjakan pekerja melebihi waktu kerja menurut Peraturan Daerah Nomor 6 Tahun 2023 tentang Pelayanan Ketenagakerjaan? |
| perdata_101 | Perdata | easy | Peraturan Pemerintah Nomor 37 Tahun 2007 (Pasal 1) | Apa yang dimaksud dengan NIK, Kartu Keluarga, dan KTP menurut PP Nomor 37 Tahun 2007? |
| perdata_102 | Perdata | medium | Peraturan Pemerintah Nomor 37 Tahun 2007 (Pasal 1 angka 23 & 32, Pasal 58-60) | Apa yang dimaksud dengan data pribadi penduduk dan apa larangan bagi pengguna serta pemegang hak akses data pribadi penduduk menurut PP Nomor 37 Tahun 2007? |
| perdata_103 | Perdata | easy | Peraturan Pemerintah Nomor 37 Tahun 2007 (Pasal 33-34) | Akta catatan sipil apa saja yang dapat diterbitkan kutipannya oleh Pejabat Pencatat Sipil pada UPTD Instansi Pelaksana menurut PP Nomor 37 Tahun 2007? |
| perdata_104 | Perdata | medium | Peraturan Pemerintah Nomor 37 Tahun 2007 (Pasal 1 angka 31, Pasal 52-53) | Apa yang dimaksud dengan hak akses dalam administrasi kependudukan dan bagaimana pemberian hak akses kepada petugas di daerah diusulkan menurut PP Nomor 37 Tahun 2007? |
| perdata_105 | Perdata | hard | Peraturan Pemerintah Nomor 37 Tahun 2007 (Pasal 1 angka 22 & 30, Pasal 2, Pasal 51 ayat 3) | Siapa yang menyelenggarakan urusan administrasi kependudukan, apa yang dimaksud dengan SIAK dan Data Center, serta bagaimana alur data dalam penyelenggaraan hak akses antar tingkat penyelenggara menurut PP Nomor 37 Tahun 2007? |

#### b. Skor per model (rata-rata 10 pertanyaan)

| Model · Mode | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Rata-rata 4 metrik LLM | Waktu (median) |
|---|---|---|---|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | 1,000 | 0,931 | 0,829 | 0,771 | 0,558 | 0,258 | 0,450 | **0,883** | 11,3 dtk |
| Gemini 3.5 Flash · Berpikir | 1,000 | 0,924 | 0,804 | 0,796 | 0,566 | 0,261 | 0,445 | 0,881 | 12,6 dtk |
| Gemini 3.5 Flash-Lite · Kilat *(default)* | 0,986 | 0,914 | 0,787 | 0,789 | 0,546 | 0,248 | 0,430 | 0,869 | 6,8 dtk |
| Qwen 3.8 · Kilat | 0,986 | 0,955 | 0,796 | 0,735 | 0,519 | 0,301 | 0,441 | 0,868 | 5,1 dtk |
| GPT-OSS 120B · Berpikir | 0,956 | 0,930 | 0,762 | 0,646 | 0,437 | 0,241 | 0,373 | 0,823 | 6,1 dtk |
| *Target* | *≥ 0,70* | *≥ 0,55* | *≥ 0,52* | *≥ 0,50* | *≥ 0,25* | *≥ 0,10* | *≥ 0,22* | | |

**Semua model melewati target di semua metrik.**

#### c. Skor retrieval (sama untuk semua model)

| Metrik | Skor | Target | Status |
|---|---|---|---|
| Context Precision@10 | 0,754 | ≥ 0,60 | ✅ |
| Context Recall, model Gemini (semua potongan) | 0,933 | ≥ 0,60 | ✅ |
| Context Recall, model Groq (20 potongan teratas) | 0,858 | ≥ 0,60 | ✅ |

#### d. Answer Correctness per domain dan tingkat kesulitan

| Model · Mode | Ketenagakerjaan | Perdata | Easy | Medium | Hard |
|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | 0,892 | 0,767 | 0,838 | 0,755 | 0,961 |
| Gemini 3.5 Flash · Berpikir | 0,829 | 0,779 | 0,778 | 0,793 | 0,879 |
| Gemini 3.5 Flash-Lite · Kilat | 0,785 | 0,789 | 0,860 | 0,656 | 0,903 |
| Qwen 3.8 · Kilat | 0,786 | 0,806 | 0,717 | 0,809 | 0,929 |
| GPT-OSS 120B · Berpikir | 0,747 | 0,776 | 0,746 | 0,771 | 0,774 |

#### e. Skor lengkap per model per pertanyaan

**Gemini 3.5 Flash-Lite · Kilat (default)**

| ID | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Waktu | Kata |
|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 1,000 | 0,852 | 0,820 | 0,770 | 0,513 | 0,348 | 0,336 | 7,4 dtk | 122 |
| naker_102 | 1,000 | 0,876 | 0,661 | 0,770 | 0,517 | 0,214 | 0,315 | 6,0 dtk | 133 |
| naker_103 | 1,000 | 0,972 | 0,758 | 1,000 | 0,636 | 0,234 | 0,437 | 7,7 dtk | 179 |
| naker_104 | 1,000 | 0,929 | 0,870 | 0,800 | 0,452 | 0,101 | 0,385 | 6,2 dtk | 94 |
| naker_105 | 0,857 | 0,899 | 0,814 | 0,800 | 0,534 | 0,093 | 0,399 | 6,7 dtk | 180 |
| perdata_101 | 1,000 | 0,978 | 0,886 | 0,890 | 0,679 | 0,436 | 0,558 | 6,0 dtk | 146 |
| perdata_102 | 1,000 | 0,954 | 0,614 | 0,600 | 0,596 | 0,257 | 0,537 | 10,6 dtk | 120 |
| perdata_103 | 1,000 | 0,922 | 0,863 | 0,590 | 0,311 | 0,078 | 0,310 | 7,5 dtk | 81 |
| perdata_104 | 1,000 | 0,883 | 0,592 | 0,670 | 0,590 | 0,441 | 0,483 | 6,8 dtk | 127 |
| perdata_105 | 1,000 | 0,873 | 0,992 | 1,000 | 0,634 | 0,277 | 0,539 | 6,9 dtk | 178 |

**Gemini 3.6 Flash · Kilat**

| ID | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Waktu | Kata |
|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 1,000 | 0,860 | 0,865 | 0,800 | 0,527 | 0,138 | 0,377 | 19,5 dtk | 150 |
| naker_102 | 1,000 | 0,883 | 0,877 | 0,800 | 0,502 | 0,310 | 0,357 | 9,7 dtk | 154 |
| naker_103 | 1,000 | 0,994 | 0,906 | 0,920 | 0,659 | 0,300 | 0,462 | 12,5 dtk | 224 |
| naker_104 | 1,000 | 0,950 | 0,881 | 0,800 | 0,424 | 0,169 | 0,375 | 39,3 dtk | 100 |
| naker_105 | 1,000 | 0,914 | 0,928 | 0,750 | 0,429 | 0,153 | 0,316 | 11,1 dtk | 171 |
| perdata_101 | 1,000 | 0,990 | 0,744 | 0,730 | 0,781 | 0,392 | 0,684 | 10,5 dtk | 117 |
| perdata_102 | 1,000 | 0,956 | 0,645 | 0,550 | 0,565 | 0,283 | 0,459 | 39,3 dtk | 111 |
| perdata_103 | 1,000 | 0,917 | 0,862 | 0,630 | 0,397 | 0,162 | 0,353 | 9,0 dtk | 43 |
| perdata_104 | 1,000 | 0,905 | 0,590 | 0,730 | 0,577 | 0,387 | 0,489 | 11,6 dtk | 118 |
| perdata_105 | 1,000 | 0,937 | 0,994 | 1,000 | 0,718 | 0,290 | 0,630 | 10,3 dtk | 150 |

**Gemini 3.5 Flash · Berpikir**

| ID | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Waktu | Kata |
|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 1,000 | 0,862 | 0,798 | 0,710 | 0,496 | 0,203 | 0,334 | 13,2 dtk | 130 |
| naker_102 | 1,000 | 0,876 | 0,782 | 0,800 | 0,605 | 0,334 | 0,439 | 13,8 dtk | 99 |
| naker_103 | 1,000 | 0,958 | 0,872 | 0,920 | 0,545 | 0,266 | 0,390 | 14,1 dtk | 218 |
| naker_104 | 1,000 | 0,938 | 0,928 | 0,800 | 0,444 | 0,205 | 0,321 | 8,2 dtk | 105 |
| naker_105 | 1,000 | 0,913 | 0,766 | 0,860 | 0,568 | 0,136 | 0,408 | 13,3 dtk | 194 |
| perdata_101 | 1,000 | 0,944 | 0,524 | 0,670 | 0,746 | 0,386 | 0,685 | 11,6 dtk | 110 |
| perdata_102 | 1,000 | 0,990 | 0,612 | 0,600 | 0,558 | 0,256 | 0,445 | 11,6 dtk | 117 |
| perdata_103 | 1,000 | 0,922 | 0,862 | 0,770 | 0,407 | 0,156 | 0,345 | 12,6 dtk | 36 |
| perdata_104 | 1,000 | 0,905 | 0,904 | 0,830 | 0,656 | 0,400 | 0,545 | 9,5 dtk | 90 |
| perdata_105 | 1,000 | 0,929 | 0,992 | 1,000 | 0,634 | 0,267 | 0,534 | 12,7 dtk | 184 |

**GPT-OSS 120B · Berpikir**

| ID | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Waktu | Kata |
|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 1,000 | 0,862 | 0,628 | 0,550 | 0,284 | 0,182 | 0,294 | 4,6 dtk | 72 |
| naker_102 | 1,000 | 0,876 | 0,782 | 0,800 | 0,482 | 0,232 | 0,363 | 4,9 dtk | 86 |
| naker_103 | 1,000 | 0,962 | 0,712 | 0,860 | 0,422 | 0,313 | 0,301 | 6,4 dtk | 210 |
| naker_104 | 1,000 | 0,984 | 0,629 | 0,500 | 0,342 | 0,316 | 0,357 | 6,2 dtk | 159 |
| naker_105 | 1,000 | 0,899 | 0,987 | 0,630 | 0,404 | 0,023 | 0,309 | 6,2 dtk | 162 |
| perdata_101 | 1,000 | 0,943 | 0,992 | 0,820 | 0,682 | 0,368 | 0,550 | 5,1 dtk | 100 |
| perdata_102 | 0,800 | 0,966 | 0,860 | 0,670 | 0,526 | 0,248 | 0,453 | 6,2 dtk | 132 |
| perdata_103 | 1,000 | 0,962 | 0,736 | 0,670 | 0,340 | 0,126 | 0,328 | 5,0 dtk | 73 |
| perdata_104 | 0,889 | 0,924 | 0,732 | 0,530 | 0,397 | 0,322 | 0,321 | 6,0 dtk | 168 |
| perdata_105 | 0,875 | 0,918 | 0,562 | 0,430 | 0,492 | 0,284 | 0,452 | 7,0 dtk | 188 |

**Qwen 3.8 · Kilat**

| ID | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Waktu | Kata |
|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 1,000 | 0,976 | 0,558 | 0,550 | 0,431 | 0,232 | 0,386 | 4,6 dtk | 81 |
| naker_102 | 1,000 | 0,984 | 0,867 | 0,880 | 0,450 | 0,462 | 0,405 | 4,5 dtk | 198 |
| naker_103 | 1,000 | 0,959 | 0,828 | 1,000 | 0,633 | 0,411 | 0,481 | 5,1 dtk | 206 |
| naker_104 | 1,000 | 0,981 | 0,738 | 0,670 | 0,465 | 0,247 | 0,421 | 5,2 dtk | 131 |
| naker_105 | 1,000 | 0,974 | 0,941 | 0,880 | 0,506 | 0,346 | 0,351 | 5,1 dtk | 191 |
| perdata_101 | 0,857 | 0,980 | 0,703 | 0,730 | 0,563 | 0,413 | 0,429 | 4,8 dtk | 174 |
| perdata_102 | 1,000 | 0,949 | 0,879 | 0,550 | 0,543 | 0,237 | 0,535 | 5,3 dtk | 146 |
| perdata_103 | 1,000 | 0,942 | 0,869 | 0,800 | 0,556 | 0,196 | 0,520 | 5,2 dtk | 66 |
| perdata_104 | 1,000 | 0,914 | 0,663 | 0,620 | 0,420 | 0,342 | 0,352 | 4,7 dtk | 151 |
| perdata_105 | 1,000 | 0,894 | 0,917 | 0,670 | 0,627 | 0,128 | 0,534 | 5,9 dtk | 189 |

#### f. Skor retrieval per pertanyaan

| ID | Potongan dibaca (Gemini) | Context Precision@10 | Context Recall (Gemini) | Context Recall (Groq, 20 teratas) |
|---|---|---|---|---|
| naker_101 | 46 | 1,000 | 1,000 | 0,250 |
| naker_102 | 50 | 1,000 | 0,333 | 0,333 |
| naker_103 | 50 | 0,333 | 1,000 | 1,000 |
| naker_104 | 48 | 0,500 | 1,000 | 1,000 |
| naker_105 | 50 | 0,250 | 1,000 | 1,000 |
| perdata_101 | 41 | 1,000 | 1,000 | 1,000 |
| perdata_102 | 45 | 1,000 | 1,000 | 1,000 |
| perdata_103 | 39 | 1,000 | 1,000 | 1,000 |
| perdata_104 | 39 | 0,625 | 1,000 | 1,000 |
| perdata_105 | 43 | 0,833 | 1,000 | 1,000 |

#### g. Analisis

1. **Hampir tanpa halusinasi:** Faithfulness 0,956–1,000 di semua model.
2. **Jawaban fokus:** Answer Relevancy 0,914–0,955, berkat aturan prompt "RINGKAS & LANGSUNG".
3. **Selisih antar-model kecil:** rata-rata 0,823–0,883. Gemini 3.6 Flash dan 3.5 Flash · Berpikir tertinggi, tetapi ±2× lebih lambat dan kuotanya hanya 20 request/hari.
4. **Default Flash-Lite · Kilat tepat:** skornya 0,869, hanya 0,014 di bawah yang terbaik, dengan kuota 25× lebih besar dan waktu jawab lebih cepat.
5. **Model Groq dirugikan oleh batas 20 potongan:** Context Recall 0,858 vs 0,933. Contoh: naker_101 (0,25 vs 1,00), karena ketentuan pemberitahuan 7 hari berada di luar 20 potongan teratas.
6. **Skor correctness rendah tidak selalu berarti salah:** contohnya perdata_104, di mana jawaban benar tetapi memuat informasi tambahan yang tidak ada di acuan.

#### h. Keterbatasan

Juri juga salah satu model yang dinilai (Flash-Lite, tetapi skornya tidak tertinggi); hanya 10 pertanyaan dari 2 domain; prompt Ragas berbahasa Inggris sementara teks berbahasa Indonesia; setiap sampel dijalankan sekali; Context Precision dihitung pada 10 potongan teratas; mode lain (Flash-Lite Berpikir, 3.6 Flash Berpikir, Qwen Berpikir, GPT-OSS Kilat, 3.5 Flash Kilat) belum dievaluasi karena kuota harian.

### 4.2.5 Audit & Bug yang Diperbaiki

| ID | Lokasi | Bug | Dampak | Perbaikan | Bukti |
|---|---|---|---|---|---|
| BUG-01 | `lib/rateLimit.js` | `LRUCache.set()` memperpanjang TTL di setiap request | Pengguna aktif (jeda < 1 menit) terblokir setelah total N request; berlaku di semua endpoint ber-rate limit | `set(..., { noUpdateTTL: true })` | TC-RL-03 gagal sebelum perbaikan, lulus sesudahnya |
| BUG-02 | `app/api/chat/route.js` | LangChain mengulang request 429 sebanyak 6 kali | Fallback ke model cadangan baru jalan setelah ±100–110 dtk | `maxRetries: 0` | TC-MODE-05; 110 dtk → langsung |
| BUG-03 | `app/api/chat/route.js` | Hanya error kuota (429/413) yang memicu fallback | `Failed to parse stream` / 503 tampil sebagai error | `isTransientError()` ikut memicu fallback | TC-FALLBACK-01 |
| BUG-04 | `ChatArea.jsx` | `undefined === undefined` pada pesan riwayat | Halaman chat crash (`reading 'text'`) | Mode edit hanya aktif bila `editing` dan `msg.key` ada | `/chatbot` normal |
| BUG-05 | `ModeToggle.jsx` | Menu model selalu dibuka ke bawah dengan tinggi tetap | Bagian Mode keluar dari layar 1280×720 | Arah buka dan tinggi menyesuaikan ruang layar | TC-E2E-03/04 |
| BUG-06 | `app/api/admin/users/route.js` | Sisa kuota di panel admin masih dihitung dari `ChatHistory` | Angka sisa kuota di admin berbeda dengan kuota sebenarnya (yang kini dari `PromptUsage`) | Hitung dari `PromptUsage` hari ini | TC-ADMIN-QUOTA-01 (gagal sebelum perbaikan) |
| BUG-07 | `app/api/auth/login/route.js` | Registrasi menyimpan password yang di-trim, login membandingkan apa adanya | Pengguna yang mendaftar dengan spasi di awal/akhir password tidak bisa login | Jika gagal, bandingkan juga versi ter-trim (tidak melonggarkan password salah) | TC-LOGIN-07 (gagal sebelum perbaikan), TC-LOGIN-08 |
| BUG-08 | `middleware.js` | Middleware hanya menjaga `/admin` dan `/api/admin`; halaman `/dashboard` dan `/pusat-data` tidak dicek | Tamu yang membuka tautan langsung melihat tampilan halaman (sidebar, layout, kotak kosong). Data tidak bocor karena API-nya sudah wajib login | Tanpa JWT valid → redirect 307 ke `/chatbot` | Tanpa cookie: 307 → `/chatbot`; dengan cookie valid: 200 |
| BUG-09 | `app/page.js` | Halaman `/` masih berisi placeholder uji Tailwind ("Tailwind OK") | Tautan utama `tanyahukum.vercel.app` hanya menampilkan teks "Tailwind OK" | `redirect("/chatbot")` | `GET /` → 307 → `/chatbot` |
| SEC-01 | `app/api/chat/route.js` | Kuota dihitung dari `ChatHistory` | Hapus riwayat = kuota kembali; Stop sebelum selesai = bertanya gratis | Tabel `PromptUsage`; Stop setelah AI menulis tetap dihitung | TC-QUOTA-01..03 |

**Catatan temuan lain (belum diubah karena tidak berdampak fungsional besar atau menyangkut alur yang disengaja):**
- Login Google tidak mengubah email menjadi huruf kecil (berbeda dengan registrasi email). Email Google umumnya sudah huruf kecil.
- `GET`/`PATCH /api/profile` mengembalikan 401 untuk semua error tak terduga (termasuk error database), sedangkan `DELETE /api/profile` mengembalikan 500 untuk token tidak valid. Status code-nya kurang tepat, tetapi tidak membuka akses.
- Webhook pembayaran di luar production tetap memproses signature yang salah (S2, by design untuk uji sandbox).
- Cache `GET /api/dashboard` (30 dtk) dipakai bersama semua pengguna. Isinya statistik umum, bukan data pribadi.

---

# Lampiran

## A. Cara Menjalankan Seluruh Pengujian

Jalankan dari folder `tanyahukum/` di PowerShell:

```powershell
# 1. Black box + white box (232 test + coverage; laporan HTML di coverage/lcov-report)
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest --config ./jest.config.js --coverage

# 2. E2E browser (server lokal harus menyala)
$env:E2E_NO_SERVER="1"; npx playwright test

# 3. Performa endpoint & keamanan statis
node tests/performance/run-smoke.mjs
node tests/security/run-security-checks.mjs; node tests/security/run-npm-audit.mjs

# 4. Response time & uji Stop
node tests/PPL-II/scripts/e2e_response_time.mjs "Flash-Lite Kilat" lite 25
node tests/PPL-II/scripts/e2e_stop.mjs

# 5. Ragas
node tests/PPL-II/ragas/generate_answers.mjs lite,fast,next,gptoss,qwen
tests/PPL-II/ragas/.venv/Scripts/python tests/PPL-II/ragas/evaluate_ragas.py
tests/PPL-II/ragas/.venv/Scripts/python tests/PPL-II/ragas/summarize.py
```

## B. Variabel Lingkungan

Nama variabel saja; nilainya disimpan di `.env` / `.env.local` (tidak di-commit) dan di pengaturan Vercel.

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Koneksi PostgreSQL (Supabase) |
| `JWT_SECRET` | Tanda tangan token sesi (HS256) |
| `PINECONE_API_KEY`, `PINECONE_INDEX_V2` | Database vektor |
| `VOYAGEAI_API_KEY` | Embedding |
| `GOOGLE_API_KEY` | Gemini API |
| `GROQ_API_KEY` | Model GPT-OSS & Qwen (tanpa key → otomatis Gemini) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | Opsional: ganti model utama/cadangan |
| `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | Pembayaran |
| `SMTP_HOST` dan kredensial SMTP | Email reset kata sandi |
| `NEXT_PUBLIC_LEGAL_CONTACT_EMAIL` | Email kontak di Kebijakan Privasi dan Syarat & Ketentuan |
| `NEXT_PUBLIC_SUPABASE_URL`, kunci Supabase | Penyimpanan foto profil |

## C. Dokumen Pendukung

| Berkas | Isi |
|---|---|
| `tests/PPL-II/RINGKASAN_1_HALAMAN.md` | Ringkasan menyeluruh 1 halaman |
| `tests/PPL-II/PENGUJIAN_BLACKBOX.md` | Laporan black box (berdiri sendiri) |
| `tests/PPL-II/PENGUJIAN_WHITEBOX.md` | Laporan white box |
| `tests/PPL-II/PENGUJIAN_NONFUNGSIONAL.md` | Laporan non-fungsional |
| `tests/PPL-II/EVALUASI_RESPONSE_TIME.md` | Laporan response time |
| `tests/PPL-II/EVALUASI_RAGAS_V3.md` | Laporan Ragas |
| `tests/PPL-II/ragas/` | Dataset, jawaban, skrip, dan skor mentah Ragas |
| `docs/Diagram_Doktek.md` | 51 diagram (PNG/SVG) |
