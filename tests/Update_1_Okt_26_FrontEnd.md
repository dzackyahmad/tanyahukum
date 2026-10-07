# Update 1 — Oktober 2026 (Security & Front-End)

| | |
|---|---|
| **Periode** | 5 – 7 Oktober 2026 |
| **Cakupan** | Keamanan backend, tampilan chatbot, referensi dokumen, tutorial pengguna, perbaikan bug, tooling lokal |
| **Prinsip** | Tidak merusak flow yang sudah jalan: format API, logika RAG/AI, pembayaran, kuota, dan skema database tetap sama |
| **Status** | ✅ **190 / 190 test lulus** (23 file) · ✅ `next build` berhasil · ✅ 0 kerentanan *critical* di dependensi runtime |

### Ringkasan angka

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Total test otomatis | 136 (4 gagal) | **190 (0 gagal)** |
| Test keamanan (`tests/security`) | 24 | **65** |
| Upgrade keamanan | — | **30** |
| Perubahan fitur & perbaikan front-end | — | **12** |
| Rekomendasi pertanyaan chatbot (teruji) | 0 | **21** |
| Versi Next.js | 16.2.6 (ada advisory *critical*) | **16.3.8** |

> Detail lengkap tiap upgrade keamanan ada di [`Upgrade_Security_P1.md`](./Upgrade_Security_P1.md). Dokumen ini merangkum keseluruhan progres.

---

## Daftar Isi

1. [Bagian A — Upgrade Keamanan](#bagian-a--upgrade-keamanan)
2. [Bagian B — Fitur & Tampilan Front-End](#bagian-b--fitur--tampilan-front-end)
3. [Bagian C — Perbaikan Bug & Masalah Operasional](#bagian-c--perbaikan-bug--masalah-operasional)
4. [Bagian D — Pengujian](#bagian-d--pengujian)
5. [Bagian E — Belum Dikerjakan & Rekomendasi](#bagian-e--belum-dikerjakan--rekomendasi)
6. [Tabel Pemetaan Perubahan](#tabel-pemetaan-perubahan)
7. [Ringkasan Poin](#ringkasan-poin)

---

## Bagian A — Upgrade Keamanan

Diawali audit menyeluruh (bug, security, code quality), lalu celah diperbaiki bertahap. Setiap perbaikan dibuat sebagai pengecekan tambahan yang tidak terasa oleh pengguna normal, dan dibuktikan dengan test.

### A1. Perlindungan data pribadi (anti-IDOR)

| Upgrade | Cara dibuat | Dampak |
|---|---|---|
| **Chat pribadi** | Pesan diambil dengan filter `chatId` **dan** `userId` sesi; kepemilikan `chatId` dicek sebelum AI dipanggil | Chat orang lain tidak bisa dibaca atau disisipi pesan |
| **Checkout wajib login** | `userId` diambil dari JWT, bukan dari body; body `userId` yang berbeda ditolak 403 | Transaksi tidak bisa dibuat atas nama orang lain |
| **Respons admin aman** | Prisma `select` dengan `SAFE_USER_SELECT` | `passwordHash` & `resetToken` tidak lagi terkirim |
| **Detail regulasi & dashboard** | Field `content`, `filePath`, `createdBy` tidak dikirim; dokumen nonaktif → 404 | Data internal & ID admin tidak bocor |
| **Log tanpa data pribadi** | `console.log` berisi email/userId/server key dihapus | Log server aman dibaca tim |

### A2. Autentikasi & otorisasi

| Upgrade | Cara dibuat | Dampak |
|---|---|---|
| **Admin 2 lapis** | Helper `requireAdmin()` di 17 handler admin: cek sesi + role terbaru dari DB | Admin yang di-demote langsung kehilangan akses |
| **Guard halaman `/admin`** | Middleware memverifikasi JWT; non-admin di-redirect ke `/chatbot` | Panel admin tidak bisa dibuka user biasa |
| **Proteksi CSRF** | Middleware menolak POST/PATCH/DELETE dari origin lain | Situs lain tidak bisa memicu aksi atas nama user |
| **JWT dikunci HS256** | `algorithms: ['HS256']` di semua verifikasi token | Token dengan algoritma lain ditolak |
| **Rate limit** | Bucket per endpoint + limit per email login, reset password, Google, chat (15/menit) | Brute-force & spam terbatas |
| **Login Google** | Tolak `email_verified=false`; tolak jika `GOOGLE_CLIENT_ID` kosong | Akun tidak bisa diambil alih lewat Google |
| **Logout pasti** | Cookie selalu dihapus walau Supabase error | Sesi benar-benar berakhir |
| **Admin terlindungi** | Whitelist role/tier; admin tidak bisa hapus/demote diri sendiri | Panel admin tidak terkunci |

### A3. Pembayaran

| Upgrade | Cara dibuat | Dampak |
|---|---|---|
| **Webhook aman** | Server key tidak di-log, signature dibandingkan *constant-time*, fail-closed jika key kosong, nominal dicocokkan | Notifikasi pembayaran palsu ditolak |
| **Mode Midtrans via env** | `MIDTRANS_IS_PRODUCTION` (default sandbox) | Siap go-live tanpa ubah kode |

### A4. Input, file & konfigurasi

| Upgrade | Cara dibuat | Dampak |
|---|---|---|
| **Validasi profil & input** | Email dinormalisasi & divalidasi, batas panjang nama/judul/pesan, cek tipe data | Data tersimpan konsisten |
| **Cek isi file upload** | Validasi *magic bytes* (JPEG/PNG/WEBP, `%PDF-`), batas ukuran | File palsu ditolak |
| **Validasi URL admin** | `javascript:` ditolak; link tanpa `https://` dilengkapi otomatis | Mencegah XSS lewat link |
| **Proxy download** | HTTPS saja, tanpa redirect, maks 100 MB | Tidak bisa disalahgunakan sebagai proxy |
| **Security headers** | `next.config.mjs`: anti-clickjacking, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy` | Proteksi browser standar aktif |
| **Email wajib TLS** | `requireTLS` untuk SMTP port 587 | Token reset tidak terkirim tanpa enkripsi |
| **Upgrade dependensi** | Next.js 16.3.8 + `npm audit fix` (tanpa major bump) | Menutup advisory critical (middleware bypass, RCE) |

---

## Bagian B — Fitur & Tampilan Front-End

### B1. Disclaimer AI

- **Apa:** satu baris di bawah kotak chat — *"TanyaHukum bisa salah. Periksa kembali ke peraturan aslinya."* — dengan tautan **Keterbatasan AI**.
- **Cara dibuat:** komponen `AIDisclaimer.jsx`; tautan membuka modal berisi 4 poin singkat (jawaban bisa salah, data terbatas, bukan nasihat hukum, privasi). Modal ditutup dengan tombol, `Esc`, atau klik di luar.
- **Dampak:** pengguna paham batasan AI tanpa mengganggu percakapan.

### B2. Tampilan chat

- **Apa:** kolom percakapan lebih lebar (`max-w-5xl`), pesan user di kanan, jawaban AI di kiri dengan avatar logo, tombol **Salin / Ulangi** di bawah jawaban.
- **Cara dibuat:** layout ulang di `ChatArea.jsx`; status "Tersalin" memakai state React, bukan manipulasi DOM.
- **Dampak:** ruang kosong berkurang, lebih rapi seperti ChatGPT/Claude.

### B3. Format jawaban AI

- **Apa:** markdown lebih bersih — tanpa garis bawah di teks tebal, jarak poin rapat, sub-poin menjorok.
- **Cara dibuat:** komponen markdown kustom di `LegalResponse.jsx`, di-*memo* agar jawaban lama tidak render ulang.
- **Dampak:** jawaban lebih mudah dibaca.

### B4. Referensi dokumen yang bisa diklik

- **Apa:** kutipan `(Sumber: ..., Hal: ...)` diubah menjadi nomor kecil **[1] [2]** di kalimat dan daftar **Referensi** di akhir jawaban. Klik → PDF terbuka di tab baru, langsung ke halaman yang dikutip (`#page=`).
- **Cara dibuat:**
  - Parser kutipan mendukung berbagai format AI: teks tebal, nama dengan kurung, **beberapa sumber dalam satu kutipan** (dipisah `;`), format lama `[DOKUMEN | Sumber | Hal]`.
  - Endpoint baru **`GET /api/regulations/resolve`** (read-only) mencocokkan judul kutipan ke dokumen di DB — persis atau berdasarkan akhiran judul (AI kadang menghilangkan awalan kategori). Hanya dokumen aktif, rate limit, URL divalidasi, tidak mencatat log pencarian.
  - Hasil pencarian di-*cache* di browser; judul yang tidak ditemukan dicoba ulang setelah 30 detik.
  - Kutipan tanpa nama dokumen (`DOKUMEN 11`) disembunyikan dan diberi catatan.
- **Dampak:** ±95% dokumen yang dikutip bisa langsung dibuka; berlaku juga untuk riwayat chat lama.

### B5. Perbaikan prompt kutipan (backend)

- **Apa:** AI wajib menulis nama dokumen persis dan lengkap.
- **Cara dibuat:** di `chat/route.js`, label konteks `[DOKUMEN n | ...]` diganti `[Sumber: ... | Hal: ...]`; aturan kutipan diperjelas (larang "DOKUMEN"/nomor, beberapa sumber dipisah `;`); contoh diganti format nama dokumen asli.
- **Dampak:** referensi pada jawaban baru bisa ditautkan. Hanya teks prompt yang berubah.

### B6. Tutorial pengguna baru (onboarding)

- **Apa:** setelah login, muncul tawaran *"Mau lihat tutorial singkat?"*. Jika ya, 5 bagian disorot satu per satu ala tutorial game: **Chatbot → Dashboard → Pusat Data Hukum → Subscription → Profil**.
- **Cara dibuat:** komponen `OnboardingTour.jsx` tanpa library tambahan; elemen ditandai atribut `data-tour`, sorotan memakai lubang *box-shadow*, tooltip menyesuaikan posisi. Lanjut dengan klik area yang disorot, tombol Lanjut, atau panah keyboard. Muncul sekali per akun (disimpan di `localStorage`); bisa diulang via event `start-tour`.
- **Dampak:** pengguna baru langsung mengenal fitur utama.

### B7. Rekomendasi pertanyaan acak

- **Apa:** 4 kartu pertanyaan di layar chat kosong; sekali klik langsung terkirim. Diacak ulang setiap obrolan baru dari **21 pertanyaan**.
- **Cara dibuat:** setiap kandidat **diuji ke database vektor** (Voyage + Pinecone); hanya pertanyaan yang dokumen teratasnya berisi pasal yang menjawab langsung yang dipakai (21 lolos dari 42 kandidat). Pengacakan Fisher–Yates dijalankan di browser agar tidak memicu error hydration.
- **Dampak:** pengguna bisa menguji chatbot dengan pertanyaan yang pasti terjawab baik.

---

## Bagian C — Perbaikan Bug & Masalah Operasional

| Masalah | Penyebab | Solusi | Dampak |
|---|---|---|---|
| **Urutan chat terbalik** (AI di atas pertanyaan) | Pertanyaan & jawaban disimpan paralel dengan timestamp sama persis (72 pasang di DB) | Jawaban AI diberi `createdAt` +1 ms; riwayat diurutkan `createdAt` lalu `role` | Urutan selalu benar, termasuk data lama |
| **Error kuota habis** | `onOpenSubscription` tidak dikirim halaman chatbot | Fallback ke `/subscription` | Tidak crash |
| **4 test lama gagal** | Test belum memakai mock sesi login | Test diperbaiki | Suite hijau |
| **Login 500** | Project Supabase di-*pause* | Restore project di dashboard Supabase | Database aktif kembali |
| **Chat gagal (Pinecone `ETIMEDOUT`)** | Router memberi alamat IPv6 (NAT64) yang mati; Node hanya memberi 250 ms per alamat | `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=1000` di launcher | Koneksi ke Pinecone stabil di lokal |
| **PDF tidak bisa dibuka (`ERR_CERT_COMMON_NAME_INVALID`)** | Provider (Indosat) memblokir domain `r2.dev` | Sementara: Secure DNS di Chrome. Permanen: custom domain R2 (lihat Bagian E) | Terdiagnosis, menunggu domain |

**Launcher lokal:** `Jalankan_TanyaHukum.bat` (di luar repo) — klik dua kali untuk mengecek Node.js & `.env`, install dependensi jika perlu, menjalankan `npm run dev`, dan membuka browser saat server siap. Jika aplikasi sudah berjalan, cukup membuka browser.

---

## Bagian D — Pengujian

```bash
npm run test:unit                                   # semua test (190)
npx jest --config ./jest.config.js tests/security   # test keamanan (65)
npm audit --omit=dev                                # kerentanan dependensi runtime
```

| File test baru / diubah | Isi |
|---|---|
| `tests/security/hardening.test.js` | 20 test: guard admin, webhook, download, CSRF, halaman admin, validasi user |
| `tests/security/hardening-extra.test.js` | 20 test: headers, JWT, rate limit, logout, profil, upload, email TLS, Midtrans, dashboard |
| `tests/security/payment-checkout-idor.test.js` | Ditulis ulang: dulu meng-*assert* celah, kini membuktikan celah tertutup |
| `tests/unit/regulations/resolve.test.js` | 6 test endpoint referensi (cocok persis/akhiran, hanya dokumen aktif, URL aman, batas jumlah) |
| `tests/unit/chat/chat.test.js` | +5 test: IDOR chat, batas pesan, urutan riwayat |
| `tests/unit/payment/checkout.test.js`, `regulations.test.js`, `api-errors.test.js` | Disesuaikan dengan sesi login & perilaku aman |

Selain test otomatis, setiap perubahan tampilan diverifikasi dengan kompilasi halaman `/chatbot` (HTTP 200) dan render contoh jawaban.

---

## Bagian E — Belum Dikerjakan & Rekomendasi

| Prioritas | Item | Alasan belum | Langkah |
|---|---|---|---|
| 🔴 Tinggi | **Custom domain Cloudflare R2** | Butuh domain milik tim | Hubungkan domain ke bucket R2 → update 5.000 `fileUrl` di DB |
| 🔴 Tinggi | **Commit ke git** | Index git berisi *staged deletion* 431 file sejak sebelum pengerjaan | Cek `git status` sebelum commit |
| 🟠 Sedang | **Ganti `JWT_SECRET`** | Semua user akan login ulang | Gunakan nilai acak 48 byte, set juga di Vercel |
| 🟠 Sedang | **Go-live Midtrans** | Masih sandbox | Set env production + key production |
| 🟡 Rendah | Pencabutan sesi (`tokenVersion`) | Butuh migrasi DB | Tambah kolom & cek di `getSession` |
| 🟡 Rendah | Baseline migrasi Prisma | Menyentuh DB produksi | `prisma migrate diff` + `migrate resolve` |
| 🟡 Rendah | nodemailer 8 → 10 | Major upgrade | Upgrade lalu uji kirim email reset |

---

## Tabel Pemetaan Perubahan

| No | Nama | Kategori | Dampak Teknis |
|---|---|---|---|
| 1 | Proteksi IDOR chat | Security | Query pesan di-*scope* `userId`; cek pemilik `chatId` sebelum LLM |
| 2 | Checkout wajib login | Security | `userId` dari JWT; mismatch body → 403 |
| 3 | Pengamanan webhook | Security | Key tidak di-log, signature *constant-time*, fail-closed, cek nominal |
| 4 | Respons admin aman | Security | `SAFE_USER_SELECT`, tanpa `passwordHash`/`resetToken` |
| 5 | Admin 2 lapis | Security | `requireAdmin()` cek role dari DB di 17 handler |
| 6 | Endpoint regulasi publik | Security | Whitelist `sortBy`, SearchLog dari sesi, error generik |
| 7 | Link reset tidak bocor | Security | `resetUrl` hanya di `development` |
| 8 | Email Google terverifikasi | Security | Tolak `email_verified=false` |
| 9 | Log tanpa PII | Security | Email/userId/key dihapus dari log |
| 10 | Logout pasti | Security | Cookie selalu dihapus |
| 11 | Security headers | Security | XFO, CSP `frame-ancestors`, `nosniff`, HSTS, `Permissions-Policy` |
| 12 | Validasi profil | Security | Email normalisasi, 409 duplikat, batas panjang |
| 13 | Cek isi file upload | Security | *Magic bytes* gambar/PDF |
| 14 | Validasi URL admin | Security | Hanya http/https, auto `https://` |
| 15 | Proxy download ketat | Security | HTTPS, `redirect: manual`, maks 100 MB |
| 16 | Rate limit diperluas | Security | Bucket per endpoint, limit chat/reset/Google |
| 17 | Mode Midtrans via env | Security | `MIDTRANS_IS_PRODUCTION`, default sandbox |
| 18 | Upgrade dependensi | Security | Next.js 16.3.8, 0 critical runtime |
| 19 | Proteksi CSRF | Security | Tolak mutasi lintas origin di middleware |
| 20 | Guard halaman admin | Security | Redirect non-admin dari `/admin` |
| 21 | JWT HS256 | Security | `algorithms: ['HS256']` |
| 22 | Limit login per akun | Security | 10 percobaan/menit per email |
| 23 | Google fail-closed | Security | Tolak jika `GOOGLE_CLIENT_ID` kosong |
| 24 | Whitelist role/tier | Security | Hanya USER/ADMIN, FREE/PRO |
| 25 | Proteksi akun admin sendiri | Security | Tidak bisa hapus/demote diri |
| 26 | Detail regulasi aman | Security | Nonaktif → 404, tanpa `content` |
| 27 | ID admin tersembunyi | Security | `createdBy` tidak dikirim di dashboard |
| 28 | Anti-spam statistik | Security | View & SearchLog dibatasi per IP |
| 29 | Email wajib TLS | Security | `requireTLS` port 587 |
| 30 | Validasi input | Security | Batas panjang/tipe chat, profil, PDF 50 MB |
| 31 | Disclaimer AI | Front-End | Komponen `AIDisclaimer` + modal keterbatasan |
| 32 | Tampilan chat | Front-End | Kolom lebar, avatar AI, aksi Salin/Ulangi |
| 33 | Format jawaban AI | Front-End | Komponen markdown kustom, `memo` |
| 34 | Referensi bisa diklik | Front-End | Nomor kutipan + daftar Referensi → PDF `#page=` |
| 35 | Endpoint `resolve` | Backend (baru) | Judul → `fileUrl`, cocok persis/akhiran, read-only |
| 36 | Prompt kutipan | Backend | Nama dokumen wajib persis, tanpa "DOKUMEN n" |
| 37 | Tutorial onboarding | Front-End | Spotlight 5 langkah, sekali per akun |
| 38 | Rekomendasi pertanyaan | Front-End | 21 pertanyaan teruji, 4 acak per obrolan |
| 39 | Urutan chat | Bug fix | `createdAt` +1 ms, `orderBy` createdAt + role |
| 40 | Kuota habis tidak crash | Bug fix | Fallback ke `/subscription` |
| 41 | Koneksi Pinecone lokal | Operasional | `NODE_OPTIONS` attempt-timeout 1000 ms |
| 42 | Launcher `.bat` | Operasional | Satu klik menjalankan localhost |

---

## Ringkasan Poin

**Keamanan (30 upgrade)**
- Chat pribadi, checkout, dan data admin tidak bisa diakses orang lain (IDOR ditutup).
- Akses admin dicek dua lapis; halaman admin dijaga; CSRF diblokir; token JWT dikunci HS256.
- Webhook pembayaran aman: server key tidak bocor, notifikasi palsu & nominal salah ditolak.
- Rate limit untuk login, reset password, Google, dan chat.
- Upload, URL, profil, dan input divalidasi; security headers & email TLS aktif.
- Next.js di-upgrade; 0 kerentanan critical di runtime.

**Front-End (7 fitur)**
- Disclaimer AI singkat + modal keterbatasan AI.
- Tampilan chat lebih lebar dan rapi, gaya ChatGPT/Claude.
- Jawaban AI lebih bersih dengan referensi bernomor yang bisa diklik ke PDF.
- Endpoint & prompt baru agar referensi bisa ditautkan (±95% dokumen).
- Tutorial interaktif 5 langkah untuk pengguna baru.
- 21 rekomendasi pertanyaan teruji, diacak tiap obrolan baru.

**Perbaikan & Operasional**
- Urutan chat tidak lagi terbalik; kuota habis tidak crash.
- Masalah Supabase, Pinecone, dan blokir `r2.dev` terdiagnosis dan ditangani.
- Launcher `.bat` untuk menjalankan aplikasi dengan satu klik.

**Hasil:** 190/190 test lulus · build berhasil · flow aplikasi tidak berubah.
