# Laporan Black Box Testing — TanyaHukum

> **Dokumen:** Dokumentasi Teknis PPL-II (bagian 4.2.1) · **Tanggal pengujian:** 16 Oktober 2026
> **Hasil:** **231 dari 231 kasus lulus (100%)** · 28 berkas test · 9 kategori

---

## 1. Pendahuluan

Black box testing menguji sistem **dari luar**: penguji hanya mengirim input ke endpoint API, lalu memeriksa output tanpa melihat isi kode. Yang diperiksa adalah status code, isi respons, cookie, dan data yang disimpan ke database. Tujuannya membuktikan setiap fitur berperilaku sesuai spesifikasi, termasuk saat menerima input salah atau berbahaya.

## 2. Cara Pengujian

| Aspek | Penjelasan |
|---|---|
| Alat | **Jest** (test runner) |
| Cara memanggil endpoint | Handler `app/api/**/route.js` dipanggil langsung dengan request tiruan (`tests/utils/mockRequest.js`) |
| Isolasi | Database (Prisma) dan layanan luar (Pinecone, Voyage, Gemini, Groq, Midtrans, email) diganti **mock** lewat `tests/utils/loadRouteWithMocks.js`. Test tidak membutuhkan server, internet, ataupun kuota API, dan hasilnya selalu sama. |
| Sesi login | Disimulasikan dengan mock `getSession()` (pengguna biasa, admin, atau tidak login) |
| Teknik perancangan kasus | Partisi ekuivalen (input valid/tidak valid), nilai batas (mis. pesan 5.000 karakter, password 8 karakter), uji negatif (tanpa login, data milik orang lain), uji serangan (injection, IDOR, SSRF, CSRF) |
| Kriteria lulus | Output sama persis dengan yang diharapkan pada setiap kasus |

**Perintah (PowerShell, dari folder `tanyahukum/`):**

```powershell
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest --config ./jest.config.js --coverage=false
```

## 3. Ringkasan Hasil

| No | Kategori | Berkas | Kasus | Lulus | Gagal |
|---|---|---|---|---|---|
| 1 | Autentikasi (register, login, Google, lupa & reset password) | `forgot-password.test.js`, `google.test.js`, `login-trim.test.js`, `login.test.js`, `register.test.js`, `reset-password.test.js` | 33 | 33 | 0 |
| 2 | Chat AI (JSON, streaming, mode/model, fallback, Stop, kuota, hapus semua riwayat) | `chat-features.test.js`, `chat.test.js`, `processCache.test.js` | 54 | 54 | 0 |
| 3 | Pusat Data Hukum (daftar, detail, unduh, resolve sitasi, jumlah dilihat) | `download.test.js`, `regulations.test.js`, `resolve.test.js`, `view-count.test.js` | 25 | 25 | 0 |
| 4 | Pembayaran (checkout Midtrans) | `checkout.test.js` | 9 | 9 | 0 |
| 5 | Profil (lihat, ubah, upload foto, hapus akun) | `profile.test.js` | 13 | 13 | 0 |
| 6 | Utilitas (rate limit, preferensi gaya jawaban) | `chatPreferences.test.js`, `rateLimit.test.js` | 8 | 8 | 0 |
| 7 | Keamanan (IDOR, SSRF, JWT, injection, CSRF, admin, webhook, hardening) | `chat-idor.test.js`, `download-ssrf.test.js`, `hardening-extra.test.js`, `hardening.test.js`, `input-validation.test.js`, `middleware-admin.test.js`, `payment-checkout-idor.test.js`, `payment-webhook-bypass.test.js` | 65 | 65 | 0 |
| 8 | Penanganan error | `api-errors.test.js` | 12 | 12 | 0 |
| 9 | Integrasi alur (auth & pembayaran) | `auth-flow.test.js`, `payment-flow.test.js` | 12 | 12 | 0 |
| | **Total** | | **231** | **231** | **0** |

**Kasus baru pada pembaruan 16 Oktober 2026 (28 kasus):** `TC-STOP-01` (tombol Stop), `TC-GROQ-01..04` (model Groq), `TC-MODE-01..05` (mode Kilat/Berpikir per model), `TC-FALLBACK-01` (model cadangan saat stream rusak), `TC-QUOTA-01..03` (kuota tidak bisa di-reset dengan hapus riwayat), `TC-DELALL-01..03` (hapus semua riwayat), `TC-RL-01..03` (rate limit), `TC-PREF-01..05` (preferensi gaya jawaban, termasuk anti prompt injection), `TC-LOGIN-07..08` (password ber-spasi), `TC-ADMIN-QUOTA-01` (sisa kuota di panel admin).

## 4. Detail Kasus Uji per Kategori

Judul test ditulis apa adanya dari kode (sebagian berbahasa Inggris, dari test lama).

### 1. Autentikasi (register, login, Google, lupa & reset password)

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

### 2. Chat AI (JSON, streaming, mode/model, fallback, Stop, kuota, hapus semua riwayat)

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

### 3. Pusat Data Hukum (daftar, detail, unduh, resolve sitasi, jumlah dilihat)

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

### 4. Pembayaran (checkout Midtrans)

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

### 5. Profil (lihat, ubah, upload foto, hapus akun)

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

### 6. Utilitas (rate limit, preferensi gaya jawaban)

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

### 7. Keamanan (IDOR, SSRF, JWT, injection, CSRF, admin, webhook, hardening)

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

### 8. Penanganan error

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

### 9. Integrasi alur (auth & pembayaran)

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

## 5. Kesimpulan

1. Seluruh **231 kasus lulus**. Semua fungsi utama (autentikasi, chat AI, pusat data hukum, pembayaran, profil, admin) berperilaku sesuai spesifikasi dari sisi input/output.
2. **65 kasus keamanan** lulus: pengguna tidak bisa mengakses data orang lain, endpoint admin tertutup bagi non-admin, dan input berbahaya ditolak.
3. Fitur baru (pemilih model, Stop, hapus semua riwayat, kuota, fallback, preferensi gaya jawaban) masing-masing punya kasus uji sendiri.
4. Empat bug ditemukan lewat pengujian ini: rate limiter yang tidak pernah reset (BUG-01), error stream yang tidak di-fallback (BUG-03), sisa kuota admin yang salah hitung (BUG-06), dan password ber-spasi yang gagal login (BUG-07). Keduanya sudah diperbaiki; lihat [PENGUJIAN_WHITEBOX.md](PENGUJIAN_WHITEBOX.md#5-temuan-bug--perbaikan).
