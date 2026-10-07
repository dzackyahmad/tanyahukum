# Upgrade Security P1 — TanyaHukum

| | |
|---|---|
| **Tanggal** | 5 Oktober 2026 |
| **Ruang lingkup** | API backend (`app/api/**`), `middleware.js`, `lib/`, `next.config.mjs`, dependensi npm |
| **Prinsip** | Menutup celah keamanan **tanpa mengubah flow aplikasi**: format request/response, logika AI/RAG, alur pembayaran, kuota, dan skema database tetap sama. |
| **Hasil akhir** | ✅ **182 / 182 test lulus** (22 file test) · ✅ `next build` berhasil · ✅ 0 kerentanan *critical* di dependensi runtime |

### Ringkasan angka

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Total test | 136 | **182** |
| Test lulus | 132 (4 gagal) | **182 (0 gagal)** |
| Test keamanan (`tests/security`) | 24 | **65** |
| Versi Next.js | 16.2.6 (ada advisory *critical*) | **16.3.8** |
| Kerentanan npm (semua dependensi) | 42 (2 critical, 28 high) | 14 (0 critical; sisanya tool dev/build + nodemailer) |
| Kerentanan npm runtime (`--omit=dev`) | — | 1 high (nodemailer, butuh major upgrade) |

> 4 test yang gagal sebelum upgrade (TC-ERR-06, 07, 10, 12) **bukan bug aplikasi**. Test itu belum memakai mock sesi login setelah endpoint chat/checkout diwajibkan login. Test-nya sudah diperbaiki.

### Cara menjalankan test

```bash
npm ci --legacy-peer-deps
npm run test:unit                                   # semua test (unit, integration, security, error-handling)
npx jest --config ./jest.config.js tests/security   # khusus test keamanan
npm audit --omit=dev                                # cek kerentanan dependensi runtime
```

Semua test memakai **Jest** dengan mock Prisma, sesi login (`getSession`), dan layanan eksternal (Midtrans, Google, Pinecone, Supabase). Karena itu test tidak menyentuh database atau layanan asli.

---

## 1. Security yang sudah ada sebelumnya

Fitur keamanan berikut **sudah ada sebelum upgrade** dan tetap dipertahankan.

| No | Security | Penjelasan singkat | Diuji dengan | Hasil |
|---|---|---|---|---|
| 1 | Hash password (bcrypt) | Password tidak pernah disimpan dalam bentuk asli | `TC-REG-01`, `TC-RP-07` | ✅ Lulus |
| 2 | Cookie sesi aman | JWT disimpan di cookie `httpOnly` (tidak bisa dibaca JavaScript), `Secure` di production, `SameSite=Lax` | `TC-GAUTH-01`, `TC-INT-AUTH-01` | ✅ Lulus |
| 3 | Anti timing attack & pesan error generik saat login | Respons sama untuk "email tidak ada" dan "password salah" | `TC-INT-AUTH-02`, login: *returns 401 when user not found* | ✅ Lulus |
| 4 | Validasi email & panjang password | Format email dicek, password minimal 8 karakter | `TC-REG-04`, `TC-REG-05`, `S-INJ-01..03` | ✅ Lulus |
| 5 | Rate limit login per IP | Maksimal 5 percobaan login per menit per IP | `TC-INT-AUTH-03` | ✅ Lulus |
| 6 | Rate limit lupa password | Maksimal 3 permintaan per 15 menit per IP | `TC-FP-05` | ✅ Lulus |
| 7 | Anti user-enumeration | Lupa password memberi pesan yang sama, baik email terdaftar maupun tidak | `TC-FP-02` | ✅ Lulus |
| 8 | Token reset password aman | Token di-hash SHA-256, berlaku 1 jam, dan hanya bisa dipakai sekali | `TC-FP-06`, `TC-RP-01`, `TC-RP-06` | ✅ Lulus |
| 9 | Proteksi API admin di middleware | `/api/admin/*` wajib JWT valid dengan role `ADMIN` | `middleware-admin.test.js` (3), `S-AUTH-01/02`, `TC-INT-AUTH-05/06` | ✅ Lulus |
| 10 | Fail-closed jika `JWT_SECRET` kosong | Server menolak (500), bukan menerima token palsu | `S-AUTH-03` | ✅ Lulus |
| 11 | Chat wajib login & cek pemilik saat rename/hapus | User tidak bisa mengubah atau menghapus chat orang lain | `chat-idor.test.js` (2), `TC-CHAT-03, 08, 09, 14, 15, 18, 19` | ✅ Lulus |
| 12 | Dashboard wajib login | Statistik tidak bisa diakses tanpa login | `S-AUTH-04` | ✅ Lulus |
| 13 | Anti-SSRF di proxy download | Hanya domain storage (`*.supabase.co`, `*.r2.dev`) yang boleh di-fetch | `S-SSRF-01..04`, `TC-DL-06` | ✅ Lulus |
| 14 | Sanitasi nama file download | Karakter berbahaya (`../`, dll.) diganti | `TC-DL-05` | ✅ Lulus |
| 15 | Anti SQL injection | Prisma ORM memakai query terparameter | `S-INJ-01..03`, `TC-REG-10` (register) | ✅ Lulus |
| 16 | Signature webhook di production | Notifikasi pembayaran palsu ditolak | `TC-INT-PAY-06` | ✅ Lulus |
| 17 | Webhook idempotent | Notifikasi ganda tidak memproses ulang pembayaran | `TC-INT-PAY-02` | ✅ Lulus |
| 18 | Blokir pembayaran ganda | User PRO tidak bisa checkout lagi | `TC-PAY-07` | ✅ Lulus |
| 19 | Profil tidak membocorkan `passwordHash` | GET profil hanya mengirim field aman | `TC-PROF-01` | ✅ Lulus |
| 20 | Validasi `avatarUrl` & `personalContext` | `javascript:` ditolak; konteks personal maksimal 500 karakter | `TC-PROF-06`, `TC-PROF-12/13` | ✅ Lulus |
| 21 | Error internal tidak dibocorkan | Pesan error DB tidak dikirim ke client (login/register) | `TC-ERR-01`, `TC-ERR-02` | ✅ Lulus |
| 22 | Render jawaban AI aman | `react-markdown` tanpa HTML mentah, sehingga payload `<script>` tidak dieksekusi | `S-XSS-01` (dokumentasi) + review kode | ✅ Lulus |
| 23 | Validasi upload avatar dasar | Ekstensi, MIME type, dan ukuran maksimal 2 MB | Review kode (sebelumnya belum ada test) | ✅ Sudah ada |

---

## 2. Security upgrade yang dilakukan

Upgrade dikerjakan dalam dua tahap. **Tahap A** menutup celah hasil audit. **Tahap B** menambah hardening kecil yang krusial. Setiap poin berisi: masalahnya, perbaikannya, dan test yang membuktikannya.

### Tahap A — Menutup celah hasil audit

**U-01 · Proteksi chat pribadi (IDOR)** — `app/api/chat/route.js`
- *Masalah:* user yang login bisa membaca riwayat konsultasi orang lain dan menyisipkan pesan ke chat orang lain, cukup dengan mengetahui `chatId`-nya.
- *Perbaikan:* pengambilan pesan dibatasi ke `userId` pemilik sesi, dan kepemilikan `chatId` dicek **sebelum** AI dipanggil.
- *Diuji dengan:* `TC-CHAT-20` (sisip ke chat orang lain → 404), `TC-CHAT-22` (query selalu dibatasi ke `userId`).

**U-02 · Checkout wajib login (IDOR)** — `app/api/payment/checkout/route.js`
- *Masalah:* `userId` diambil dari body request, sehingga siapa pun tanpa login bisa membuat transaksi atas nama user lain dan mengetahui email serta tier-nya.
- *Perbaikan:* `userId` diambil dari sesi JWT. Body `userId` tetap diterima demi kompatibilitas frontend, tapi harus sama dengan user yang login.
- *Diuji dengan:* `payment-checkout-idor.test.js` (3 test), `TC-PAY-04`, `TC-PAY-08`.

**U-03 · Pengamanan webhook pembayaran** — `app/api/payment/webhook/route.js`
- *Masalah:* server key Midtrans tercetak di log; jika key kosong, verifikasi tetap lanjut (fail-open); nominal pembayaran tidak dicek; health check menampilkan potongan key.
- *Perbaikan:* log berisi secret dihapus, signature dibandingkan secara *constant-time*, request ditolak (500) jika key kosong di production, nominal dicocokkan dengan database, dan health check tidak lagi menampilkan key.
- *Diuji dengan:* `S-WH-01` (key tidak ada di log), `S-WH-02` (fail-closed), `S-WH-03` (nominal beda → 400), `S-WH-04`, `TC-INT-PAY-06`.

**U-04 · Respons admin tanpa data sensitif** — `app/api/admin/users/**`
- *Masalah:* respons tambah/edit user mengirim `passwordHash` dan `resetToken`, dan error internal (`error.message`) ikut terkirim.
- *Perbaikan:* field dibatasi dengan `SAFE_USER_SELECT`, email dinormalisasi, dan pesan error dibuat generik.
- *Diuji dengan:* `S-ADM-04`.

**U-05 · Otorisasi admin dua lapis** — `lib/security.js` → `requireAdmin()` di 17 handler admin
- *Masalah:* seluruh keamanan admin bergantung pada middleware saja, dan role dibaca dari token yang berlaku 7 hari.
- *Perbaikan:* setiap handler admin mengecek sesi **dan role terbaru dari database**, sehingga admin yang diturunkan perannya langsung kehilangan akses.
- *Diuji dengan:* `S-ADM-01` (tanpa sesi → 401), `S-ADM-02` (token ADMIN lama, di DB sudah USER → 403), `S-ADM-03`.

**U-06 · Endpoint publik regulasi lebih aman** — `app/api/regulations/route.js`
- *Masalah:* user pada log pencarian bisa dipalsukan lewat `?userId=`, `sortBy` bebas diisi, dan detail error database dikirim ke publik.
- *Perbaikan:* user log pencarian diambil dari sesi, `sortBy`/`order` dibatasi ke daftar yang diizinkan, dan detail error dihapus.
- *Diuji dengan:* `TC-REG-08`, `TC-REG-10`, `TC-ERR-03`.

**U-07 · Link reset password tidak bocor** — `app/api/auth/forgot-password/route.js`
- *Masalah:* link reset dikirim di respons API pada semua environment selain production.
- *Perbaikan:* link hanya dikirim saat development lokal, email dinormalisasi (huruf kecil), dan kegagalan kirim email dicatat di log server.
- *Diuji dengan:* `S-FP-01`.

**U-08 · Login Google menolak email belum terverifikasi** — `app/api/auth/google/route.js`
- *Perbaikan:* jika `email_verified = false`, login ditolak (403), sehingga akun dengan email yang sama tidak bisa diambil alih.
- *Diuji dengan:* `S-GGL-02`.

**U-09 · Data pribadi dihapus dari log server**
- *Perbaikan:* email, userId, dan string berisi server key tidak lagi dicetak di log (login Google, checkout, webhook).
- *Diuji dengan:* `S-WH-01` + review kode.

**U-10 · Logout selalu menghapus sesi** — `app/api/logout/route.js`
- *Masalah:* jika Supabase error, respons tetap "Logout success" tapi cookie sesi tidak dihapus, sehingga user masih login.
- *Perbaikan:* cookie selalu dihapus, apa pun hasil dari Supabase.
- *Diuji dengan:* `S-OUT-01`.

**U-11 · Security headers** — `next.config.mjs`
- *Perbaikan:* `X-Frame-Options` dan `CSP frame-ancestors` (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (kamera/mikrofon/lokasi dimatikan), HSTS, dan header `X-Powered-By` dimatikan.
- *Catatan:* CSP `script-src` yang ketat sengaja tidak dipasang agar Google Sign-In dan Midtrans Snap tetap berjalan.
- *Diuji dengan:* `S-HDR-01`.

**U-12 · Validasi profil** — `app/api/profile/route.js`
- *Perbaikan:*
  - Email divalidasi dan dinormalisasi.
  - Email yang sudah dipakai dibalas 409 (sebelumnya 401 yang menyesatkan).
  - Akun Google yang mencoba ganti password mendapat pesan jelas, bukan crash.
  - Nama maksimal 100 karakter, dan avatar harus URL http/https.
- *Diuji dengan:* `S-PRF-01..04`, `TC-PROF-06`.

**U-13 · Validasi isi file upload (magic bytes)** — `app/api/profile/upload`, `app/api/admin/regulations/upload`
- *Masalah:* tipe file hanya dicek dari label yang dikirim browser, dan label itu bisa dipalsukan.
- *Perbaikan:* isi biner file dicek: avatar harus JPEG/PNG/WEBP asli, dokumen harus PDF asli.
- *Diuji dengan:* `S-UPL-01..04` (file palsu ditolak, file asli tetap bisa diupload).

**U-14 · Validasi URL dari admin** — regulasi & isu terkini
- *Perbaikan:* `fileUrl`/`newsLink` dengan skema `javascript:` ditolak. Link tanpa `https://` dilengkapi otomatis, jadi flow admin tidak berubah.
- *Diuji dengan:* `S-ADM-05`.

**U-15 · Proxy download diperketat** — `app/api/regulations/download/route.js`
- *Perbaikan:* hanya menerima HTTPS, tidak mengikuti redirect (mencegah lolos dari allowlist domain), dan ukuran file maksimal 100 MB.
- *Diuji dengan:* `S-DL-01`, `S-DL-02`, `S-SSRF-01..04`.

**U-16 · Rate limit diperbaiki & diperluas** — `lib/rateLimit.js`
- *Masalah:* login dan register berbagi satu kuota, sementara reset password, login Google, dan chat tidak punya limit sama sekali.
- *Perbaikan:*
  - Kuota dipisah per endpoint.
  - Limit baru untuk reset password (10/menit), login Google (10/menit), dan chat (15 pesan/menit per user).
  - Panjang pesan chat maksimal 5.000 karakter.
- *Diuji dengan:* `S-RL-02`, `S-RL-03`, `S-RL-04`, `TC-CHAT-21`, `TC-INT-AUTH-03`.

**U-17 · Mode Midtrans lewat environment variable**
- *Masalah:* mode sandbox di-hardcode, sehingga pembayaran sungguhan tidak mungkin dilakukan saat go-live.
- *Perbaikan:* `MIDTRANS_IS_PRODUCTION` dan `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`. Default-nya tetap sandbox, jadi perilaku sekarang tidak berubah.
- *Diuji dengan:* `S-MID-01`.

**U-18 · Upgrade dependensi**
- *Perbaikan:* Next.js 16.2.6 → **16.3.8** (menambal advisory middleware bypass, RCE, dan SSRF), ditambah `npm audit fix` tanpa major bump.
- *Diuji dengan:* `npm audit` (0 critical) + `next build` + seluruh test suite.

### Tahap B — Hardening kecil yang krusial

**U-19 · Proteksi CSRF** — `middleware.js`
- *Perbaikan:* request API yang mengubah data (POST/PATCH/DELETE) dari origin lain ditolak 403. Webhook server-ke-server yang tidak membawa header Origin tetap diterima.
- *Diuji dengan:* `S-CSRF-01`, `S-CSRF-02`.

**U-20 · Halaman `/admin` dijaga di server** — `middleware.js`
- *Perbaikan:* user biasa atau yang belum login diarahkan ke `/chatbot`. Sebelumnya tampilan panel admin bisa dibuka siapa saja (datanya sendiri tetap terlindungi API).
- *Diuji dengan:* `S-ADMPAGE-01`.

**U-21 · Algoritma JWT dikunci ke HS256** — `lib/auth.js`, `middleware.js`, `src/lib/auth-server.js`
- *Perbaikan:* token yang ditandatangani dengan algoritma lain otomatis ditolak.
- *Diuji dengan:* `S-JWT-01`.

**U-22 · Limit login per akun** — `app/api/auth/login/route.js`
- *Perbaikan:* maksimal 10 percobaan per menit per email, sehingga brute-force tidak bisa menghindar dengan berganti-ganti IP.
- *Diuji dengan:* `S-RL-01`.

**U-23 · Login Google fail-closed** — `app/api/auth/google/route.js`
- *Masalah:* tanpa `GOOGLE_CLIENT_ID`, library melewati pengecekan audience, sehingga token dari aplikasi Google lain bisa diterima.
- *Perbaikan:* jika variabel itu kosong, server menolak (500).
- *Diuji dengan:* `S-GGL-01`.

**U-24 · Whitelist role/tier/promptLimit** — admin users
- *Perbaikan:* hanya `USER`/`ADMIN` dan `FREE`/`PRO` yang boleh di-assign (role internal `AI` tidak bisa), dan `promptLimit` harus angka 0–100.000.
- *Diuji dengan:* `S-USR-01`.

**U-25 · Proteksi akun admin sendiri** — admin users
- *Perbaikan:* admin tidak bisa menghapus atau menurunkan role akunnya sendiri, supaya panel admin tidak terkunci.
- *Diuji dengan:* `S-USR-02`.

**U-26 · Detail regulasi publik** — `app/api/regulations/[id]/route.js`
- *Perbaikan:* dokumen yang dinonaktifkan tidak bisa diakses (404), dan isi teks penuh (`content`) serta path internal storage tidak dikirim.
- *Diuji dengan:* `S-REG-01`.

**U-27 · ID admin tidak bocor di dashboard** — `app/api/dashboard/route.js`
- *Perbaikan:* field `createdBy` dihapus dari data isu terkini yang tampil ke semua user.
- *Diuji dengan:* `S-DSH-01`.

**U-28 · Anti-spam view count & log pencarian**
- *Perbaikan:* view dihitung maksimal 3 kali per IP per dokumen per menit, dan log pencarian maksimal 30 per menit per IP. Respons ke user tetap sama.
- *Diuji dengan:* `S-REG-02`.

**U-29 · Email wajib terenkripsi (TLS)** — `lib/email.js`
- *Perbaikan:* `requireTLS` untuk port 587, sehingga email berisi token reset dan kredensial SMTP tidak pernah terkirim tanpa enkripsi.
- *Diuji dengan:* `S-MAIL-01`.

**U-30 · Validasi tipe & panjang input**
- *Perbaikan:* judul chat maksimal 200 karakter, tipe `chatId` dan `personalContext` dicek, dan upload PDF admin maksimal 50 MB.
- *Diuji dengan:* `S-CHT-01`, `S-PRF-04`.

### Lokasi test baru / yang diubah

| File | Isi |
|---|---|
| `tests/security/hardening.test.js` | **Baru**, 20 test: admin guard, webhook, download, forgot password, CSRF, halaman admin, validasi user, detail regulasi, Google config |
| `tests/security/hardening-extra.test.js` | **Baru**, 20 test: headers, JWT, rate limit, Google, logout, profil, upload, chat, email TLS, Midtrans, dashboard |
| `tests/security/payment-checkout-idor.test.js` | Ditulis ulang: sebelumnya justru meng-*assert* celah IDOR, sekarang menguji bahwa celahnya tertutup |
| `tests/unit/chat/chat.test.js` | +3 test (`TC-CHAT-20..22`) |
| `tests/unit/payment/checkout.test.js` | Disesuaikan agar memakai sesi login, +1 test (`TC-PAY-08`) |
| `tests/unit/regulations/regulations.test.js` | +1 test (`TC-REG-10`), `TC-REG-08` memakai sesi |
| `tests/error-handling/api-errors.test.js` | 4 test lama yang gagal diperbaiki (mock sesi login) |

---

## 3. Tabel ringkasan

| No | Nama Security | Penjelasan Singkat | Test | Hasil |
|---|---|---|---|---|
| U-01 | Proteksi IDOR chat | Chat hanya bisa dibaca dan ditulisi oleh pemiliknya | TC-CHAT-20, 22 | ✅ Lulus |
| U-02 | Checkout wajib login | Transaksi hanya bisa dibuat untuk akun sendiri | 3 test IDOR, TC-PAY-04, 08 | ✅ Lulus |
| U-03 | Pengamanan webhook | Key tidak bocor, signature constant-time, fail-closed, nominal dicek | S-WH-01..04 | ✅ Lulus |
| U-04 | Respons admin aman | `passwordHash`/`resetToken` tidak dikirim | S-ADM-04 | ✅ Lulus |
| U-05 | Otorisasi admin 2 lapis | Role dicek ulang dari database | S-ADM-01..03 | ✅ Lulus |
| U-06 | Endpoint regulasi publik | Log pencarian dari sesi, `sortBy` whitelist, error tidak bocor | TC-REG-08, 10, TC-ERR-03 | ✅ Lulus |
| U-07 | Link reset tidak bocor | `resetUrl` hanya di development lokal | S-FP-01 | ✅ Lulus |
| U-08 | Email Google terverifikasi | Email Google yang belum terverifikasi ditolak | S-GGL-02 | ✅ Lulus |
| U-09 | Log tanpa data pribadi | Email/userId/key tidak dicetak ke log | S-WH-01 + review | ✅ Lulus |
| U-10 | Logout pasti | Cookie sesi selalu dihapus | S-OUT-01 | ✅ Lulus |
| U-11 | Security headers | Anti-clickjacking, nosniff, HSTS, dll. | S-HDR-01 | ✅ Lulus |
| U-12 | Validasi profil | Email valid & unik, aman untuk akun Google | S-PRF-01..04 | ✅ Lulus |
| U-13 | Cek isi file upload | Gambar/PDF palsu ditolak | S-UPL-01..04 | ✅ Lulus |
| U-14 | Validasi URL admin | `javascript:` URL ditolak | S-ADM-05 | ✅ Lulus |
| U-15 | Proxy download ketat | HTTPS only, tanpa redirect, maksimal 100 MB | S-DL-01, 02, S-SSRF-01..04 | ✅ Lulus |
| U-16 | Rate limit diperluas | Kuota per endpoint, limit chat/reset/Google | S-RL-02..04, TC-CHAT-21 | ✅ Lulus |
| U-17 | Mode Midtrans via env | Siap go-live, default tetap sandbox | S-MID-01 | ✅ Lulus |
| U-18 | Upgrade dependensi | Next.js 16.3.8 + audit fix, 0 critical | npm audit + build | ✅ Lulus |
| U-19 | Proteksi CSRF | Request dari situs lain ditolak | S-CSRF-01, 02 | ✅ Lulus |
| U-20 | Guard halaman admin | Non-admin diarahkan ke `/chatbot` | S-ADMPAGE-01 | ✅ Lulus |
| U-21 | JWT dikunci HS256 | Token dengan algoritma lain ditolak | S-JWT-01 | ✅ Lulus |
| U-22 | Limit login per akun | Anti brute-force dari banyak IP | S-RL-01 | ✅ Lulus |
| U-23 | Google fail-closed | Tanpa `GOOGLE_CLIENT_ID` → login ditolak | S-GGL-01 | ✅ Lulus |
| U-24 | Whitelist role/tier | Role `AI`/nilai asing tidak bisa di-assign | S-USR-01 | ✅ Lulus |
| U-25 | Proteksi akun admin sendiri | Tidak bisa hapus/demote diri sendiri | S-USR-02 | ✅ Lulus |
| U-26 | Detail regulasi aman | Dokumen nonaktif 404, `content` tidak dikirim | S-REG-01 | ✅ Lulus |
| U-27 | ID admin tersembunyi | `createdBy` tidak tampil di dashboard | S-DSH-01 | ✅ Lulus |
| U-28 | Anti-spam statistik | View & log pencarian tidak bisa digelembungkan | S-REG-02 | ✅ Lulus |
| U-29 | Email wajib TLS | Token reset tidak terkirim tanpa enkripsi | S-MAIL-01 | ✅ Lulus |
| U-30 | Validasi input | Batas panjang & tipe input | S-CHT-01, S-PRF-04 | ✅ Lulus |

**Total: 30 upgrade, semuanya lulus test.**

---

## 4. Belum dikerjakan & rekomendasi

| Item | Alasan belum dikerjakan | Rekomendasi |
|---|---|---|
| Ganti `JWT_SECRET` | Semua user akan ter-logout | Buat secret acak: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`, lalu set di `.env.local` dan Vercel |
| Pencabutan sesi (logout semua perangkat saat reset password) | Butuh kolom baru di database (migrasi) | Tambah `tokenVersion` di tabel User dan cek di `getSession` |
| Migrasi Prisma tidak sinkron dengan schema | Menyentuh database produksi | Buat migrasi baseline (`prisma migrate diff` + `migrate resolve`) |
| nodemailer 8 → 10 | Major upgrade | Upgrade lalu uji pengiriman email reset password |
| Webhook non-production tanpa cek signature | Dipertahankan untuk testing lokal (ngrok) | Aman di Vercel karena production dan preview selalu memakai `NODE_ENV=production` |
| Rate limit lintas instance | Cache masih in-memory per server | Gunakan Redis/Upstash jika traffic sudah besar |
| Go-live pembayaran | Masih sandbox | Set `MIDTRANS_IS_PRODUCTION=true`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=true`, dan ganti key ke production |
