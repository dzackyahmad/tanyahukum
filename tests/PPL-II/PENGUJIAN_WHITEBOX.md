# Laporan White Box Testing — TanyaHukum

> **Dokumen:** Dokumentasi Teknis PPL-II (bagian 4.2.2) · **Tanggal pengujian:** 16 Oktober 2026
> **Hasil:** coverage baris **85,1%**, cabang **74,9%**, fungsi **87,9%** · rata-rata kompleksitas siklomatik **10,1** (40 handler API + middleware) · **7 bug + 1 celah keamanan diperbaiki**

---

## 1. Pendahuluan

White box testing menguji sistem **dari dalam**: penguji melihat kode sumber untuk memastikan setiap baris dan setiap percabangan (`if/else`, `try/catch`, `?:`, `&&`, `??`) benar-benar dijalankan dan berperilaku benar. Selain mengukur seberapa banyak kode yang teruji, inspeksi kode juga dipakai untuk menemukan bug logika yang tidak terlihat dari luar.

## 2. Cara Pengujian

| Teknik | Alat | Cara kerja |
|---|---|---|
| **Statement & branch coverage** | Istanbul (bawaan Jest, `--coverage`) | Saat 231 test dijalankan, Istanbul mencatat baris, pernyataan, cabang, dan fungsi mana yang dieksekusi. Persentase = bagian yang dieksekusi ÷ total. |
| **Kompleksitas siklomatik (McCabe)** | ESLint, aturan `complexity` | Menghitung jumlah jalur independen tiap handler: CC = jumlah titik keputusan + 1. Aturan ESLint juga menghitung `?.`, `??`, dan nilai default, sehingga angkanya lebih tinggi daripada hitungan manual di laporan Mei 2026. |
| **Inspeksi kode & uji jalur** | Review manual + test khusus | Jalur penting (fallback model, pembatalan stream, kuota, rate limit) dibaca baris per baris, lalu dibuatkan test yang memaksa jalur itu dijalankan. |

| CC | Interpretasi |
|---|---|
| 1–4 | Sederhana |
| 5–10 | Moderat |
| 11–20 | Kompleks |
| > 20 | Sangat kompleks: disarankan dipecah |

**Perintah:**

```powershell
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest --config ./jest.config.js --coverage
# laporan HTML: coverage/lcov-report/index.html
```

## 3. Coverage per Berkas

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
| `middleware.js` | 95,55% | 93,87% | 96,66% | 100% | 29/30 |
| `src/lib/auth-server.js` | 75% | 75% | 100% | 50% | 0/0 |
| `src/lib/processCache.js` | 95,45% | 89,28% | 80% | 100% | 12/15 |
| **Total** | **85,1%** | **83,4%** | **74,91%** | **87,87%** | **627/837** |

## 4. Kompleksitas Siklomatik per Handler

| No | Modul | Handler | CC | Interpretasi |
|---|---|---|---|---|
| 1 | `middleware.js` | middleware | 12 | Kompleks |
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
| | **Rata-rata 41 fungsi (40 handler API + middleware)** | | **10,1** | Kompleks |

## 5. Temuan Bug & Perbaikan

Ditemukan lewat inspeksi kode dan uji jalur selama pembaruan 16 Oktober 2026. Tidak ada perbaikan yang mengubah atau menghapus data. Satu-satunya perubahan database adalah penambahan tabel `PromptUsage`, yang sudah disetujui.

| ID | Lokasi | Bug | Dampak | Perbaikan | Bukti |
|---|---|---|---|---|---|
| BUG-01 | `lib/rateLimit.js` | `LRUCache.set()` memperpanjang TTL di setiap request | Pengguna aktif (jeda < 1 menit) terblokir setelah total N request, bukan N per menit. Berlaku untuk semua endpoint ber-rate limit. | `set(..., { noUpdateTTL: true })` | `TC-RL-03` gagal sebelum perbaikan, lulus sesudahnya |
| BUG-02 | `app/api/chat/route.js` `createLlm` | LangChain mengulang request 429 sebanyak 6 kali sebelum melempar error | Fallback ke model cadangan baru jalan setelah ±100–110 dtk | `maxRetries: 0` | `TC-MODE-05`; terukur 110 dtk → langsung |
| BUG-03 | `app/api/chat/route.js` | Hanya error kuota (429/413) yang memicu fallback | `Failed to parse stream` / 503 dari Gemini langsung tampil sebagai error ke pengguna | `isTransientError()` ikut memicu fallback sebelum teks ditulis | `TC-FALLBACK-01` |
| BUG-04 | `ChatArea.jsx` | `editing?.key === msg.key` bernilai `undefined === undefined` (true) untuk pesan riwayat | Halaman chat crash: `Cannot read properties of null (reading 'text')` | Mode edit hanya aktif bila `editing` dan `msg.key` ada | Halaman `/chatbot` normal |
| BUG-05 | `ModeToggle.jsx` | Menu model selalu dibuka ke bawah dengan tinggi tetap | Bagian Mode keluar dari layar 1280×720 | Arah buka dan tinggi menu menyesuaikan ruang layar | E2E `TC-E2E-03/04` |
| BUG-06 | `app/api/admin/users/route.js` | Sisa kuota di panel admin dihitung dari `ChatHistory` | Angka sisa kuota admin berbeda dengan kuota sebenarnya | Hitung dari `PromptUsage` hari ini | `TC-ADMIN-QUOTA-01` gagal sebelum perbaikan |
| BUG-07 | `app/api/auth/login/route.js` | Registrasi menyimpan password ter-trim, login membandingkan apa adanya | Pengguna yang mendaftar dengan spasi di awal/akhir password tidak bisa login | Jika gagal, bandingkan juga versi ter-trim | `TC-LOGIN-07` gagal sebelum perbaikan; `TC-LOGIN-08` |
| SEC-01 | `app/api/chat/route.js` | Kuota dihitung dari `ChatHistory` | Hapus riwayat = kuota harian kembali; Stop sebelum selesai = bertanya gratis | Tabel `PromptUsage` (tidak ikut terhapus bersama chat); Stop setelah AI menulis tetap dihitung | `TC-QUOTA-01..03` |

## 6. Analisis

1. **Modul inti teruji dengan baik:** `api/chat` 92% baris dan 81% cabang, autentikasi 88–95% baris, `payment/checkout` 100%, `middleware.js` 96% baris dan 97% cabang.
2. **Modul dengan coverage rendah:** endpoint admin (cabang 36–67%), `lib/email.js` (6%), dan `api/logout` (cabang 0%). Ini prioritas penambahan test berikutnya.
3. **Modul paling kompleks:** `PATCH /api/profile` (CC 27), `POST /api/chat` dan fungsi stream-nya (CC 25), `GET /api/regulations` (CC 20). Disarankan dipecah menjadi fungsi validasi, logika bisnis, dan penyimpanan agar lebih mudah diuji dan dirawat.
4. Kenaikan CC `POST /api/chat` dibanding Mei 2026 (11 → 25) berasal dari fitur baru (streaming, 10 mode, fallback, Stop, kuota) dan cara hitung ESLint yang lebih lengkap.
