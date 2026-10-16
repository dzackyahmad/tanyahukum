# Evaluasi Response Time — TanyaHukum

> **Dokumen:** Dokumentasi Teknis PPL-II · **Tanggal pengujian:** Oktober 2026
> **Objek uji:** endpoint `POST /api/chat` (mode streaming) beserta pipeline RAG di belakangnya
> **Skrip pengujian:** [`scripts/e2e_response_time.mjs`](scripts/e2e_response_time.mjs), [`scripts/e2e_stop.mjs`](scripts/e2e_stop.mjs)

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Alur Permintaan & Titik Pengukuran](#2-alur-permintaan--titik-pengukuran)
3. [Lingkungan Pengujian](#3-lingkungan-pengujian)
4. [Cara Pengujian](#4-cara-pengujian)
5. [Hasil Pengujian](#5-hasil-pengujian)
6. [Analisis](#6-analisis)
7. [Optimasi yang Diterapkan](#7-optimasi-yang-diterapkan)
8. [Keterbatasan Pengujian](#8-keterbatasan-pengujian)
9. [Cara Mengulang Pengujian](#9-cara-mengulang-pengujian)
10. [Kesimpulan](#10-kesimpulan)

---

## 1. Pendahuluan

### 1.1 Latar Belakang

TanyaHukum adalah chatbot hukum Indonesia berbasis *Retrieval-Augmented Generation* (RAG). Setiap pertanyaan pengguna melewati beberapa layanan eksternal secara berurutan: pembuatan embedding (Voyage AI), pencarian vektor (Pinecone), lalu pembuatan jawaban oleh model bahasa (Google Gemini atau Groq). Seluruh layanan memakai **tier gratis**.

Pada versi sebelumnya, pengguna melaporkan jawaban terasa lambat. Untuk pertanyaan yang luas, jawaban baru selesai setelah ±30 detik. Dokumen ini mencatat cara response time diukur, faktor apa saja yang memengaruhinya, dan hasil sesudah optimasi serta penambahan pilihan model.

### 1.2 Tujuan

1. Mengidentifikasi dan mengukur faktor-faktor yang memengaruhi response time.
2. Membandingkan response time versi lama (baseline) dengan versi sesudah optimasi.
3. Mengukur response time keenam mode/model jawaban yang tersedia untuk pengguna.
4. Memverifikasi bahwa tombol **Stop** benar-benar menghentikan AI dan tidak menyimpan jawaban.

### 1.3 Ruang Lingkup

| Termasuk | Tidak termasuk |
|---|---|
| Waktu dari request dikirim sampai jawaban selesai (end-to-end) | Waktu render di browser |
| Waktu pencarian dokumen (embedding + Pinecone) | Kualitas/akurasi jawaban (dievaluasi terpisah dengan Ragas) |
| Waktu sampai teks jawaban pertama muncul | Uji beban (banyak pengguna bersamaan) |
| 6 mode jawaban (Gemini & Groq) | Pengukuran di server produksi Vercel |

### 1.4 Definisi Metrik

| Metrik | Definisi | Alasan dipakai |
|---|---|---|
| **Waktu pencarian** | Selisih antara event `step: search` berstatus `active` dan `done`. Mencakup embedding Voyage + query Pinecone + penyaringan potongan dokumen. | Mengisolasi bagian *retrieval* dari bagian model bahasa. |
| **Teks pertama** (*Time To First Text*) | Waktu dari request dikirim sampai event `text` pertama diterima klien. | Menentukan kapan pengguna mulai melihat jawaban; paling berpengaruh pada kesan "cepat/lambat". |
| **Selesai** | Waktu dari request dikirim sampai event `done` diterima. | Total waktu sampai jawaban lengkap dan tersimpan. |
| **Jumlah kata** | Jumlah kata jawaban akhir. | Panjang jawaban memengaruhi waktu selesai, jadi perlu dicatat agar perbandingan adil. |

Semua waktu dalam **detik (dtk)**.

---

## 2. Alur Permintaan & Titik Pengukuran

```
Klien ──POST /api/chat {stream:true, mode}──► Server Next.js
                                                │
   [1] Validasi sesi + baca DB paralel ─────────┤  (cek kepemilikan chat, data user, kuota harian)
   [2] Embedding pertanyaan (Voyage voyage-law-2) ┐
   [3] Query Pinecone topK 50                     ├─ "Waktu pencarian"
   [4] Penyaringan potongan duplikat/noise ───────┘
   [5] Kirim konteks + pertanyaan ke model ───────── (opsional: proses berpikir/thinking)
   [6] Token jawaban pertama ─────────────────────── "Teks pertama"
   [7] Streaming jawaban sampai selesai
   [8] Simpan riwayat ke DB ──────────────────────── "Selesai" (event done)
```

Server mengirim event NDJSON (`step`, `sources`, `model`, `thinking`, `text`, `done`, `error`). Skrip uji membaca event ini dan mencatat waktunya di sisi klien.

---

## 3. Lingkungan Pengujian

| Komponen | Spesifikasi |
|---|---|
| Server aplikasi | Next.js 16 dijalankan lokal (`localhost:3000`) lewat `Jalankan_TanyaHukum.bat` |
| Sistem operasi | Windows 11 Home |
| Runtime | Node.js, dengan `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=1000` (perlu karena jaringan IPv6/NAT64 router mengganggu koneksi Pinecone) |
| Lokasi jaringan | Indonesia (koneksi rumah) |
| Embedding | Voyage AI `voyage-law-2` (tier gratis: 3 request/menit, 10K token/menit) |
| Vector DB | Pinecone, index `tanyahukum2` (78.313 vektor, potongan 1.000 karakter, overlap 200) |
| Model bahasa | Google Gemini API (tier gratis) & Groq API (tier gratis) |
| Database | PostgreSQL Supabase (Singapura) via Prisma |
| Akun uji | `test@mail.com` (token JWT dibuat lokal oleh skrip, berlaku 10–15 menit) |

**Latensi jaringan dasar (TCP RTT dari lokasi uji):**

| Layanan | RTT |
|---|---|
| Vercel | 22 ms |
| Google (Gemini) | 38 ms |
| Voyage AI | 39 ms |
| Supabase | 40 ms |
| Pinecone | 285 ms |

---

## 4. Cara Pengujian

Pengujian dibagi menjadi tiga tahap.

### 4.1 Tahap A — Uji Faktor (Terisolasi)

Setiap faktor yang diduga memperlambat diuji sendiri-sendiri, dengan memanggil layanan langsung tanpa melewati aplikasi:

| Faktor | Cara uji |
|---|---|
| Batas Voyage AI | 5 panggilan embedding berturut-turut dalam 1 menit |
| Bahasa server (Node vs Python) | 6 query Pinecone berurutan dari Node.js dan dari Python 3.11 |
| Proses berpikir & ukuran konteks | Gemini 2.5 Flash dengan kombinasi 10/50 potongan dan thinking aktif/mati/budget 512 token. Diukur waktu token pertamanya. |
| Model Groq | 3 model Groq dengan konteks 15 potongan. Diukur waktu token pertamanya. |
| Latensi jaringan | Waktu jabat tangan TCP ke tiap layanan |

### 4.2 Tahap B — Uji End-to-End per Mode

Skrip [`e2e_response_time.mjs`](scripts/e2e_response_time.mjs) mengirim pertanyaan ke `POST /api/chat` dengan `stream: true` seperti yang dilakukan browser.

**Pertanyaan uji** (dipilih untuk mewakili dua jenis pertanyaan):

| # | Pertanyaan | Karakter |
|---|---|---|
| Q1 | *"Berapa lama maksimal perjanjian kerja waktu tertentu (PKWT)?"* | Spesifik, jawabannya pendek |
| Q2 | *"Apa hak istirahat dan cuti tahunan pekerja?"* | Luas, jawabannya panjang (banyak poin) |

**Prosedur untuk setiap mode:**

1. Pastikan server lokal menyala dan akun uji tidak memiliki chat.
2. Jalankan skrip dengan label, id mode, dan jeda antarpertanyaan. Jeda diperlukan karena Voyage gratis hanya 3 request/menit; tanpa jeda, waktu pencarian bisa melonjak 20–40 dtk dan hasilnya tidak mewakili kondisi normal.
3. Skrip membaca event streaming dan mencatat waktu pencarian, teks pertama, selesai, jumlah kata, jumlah potongan yang disaring, serta model yang benar-benar menjawab (termasuk bila terjadi fallback).
4. Setiap chat yang terbentuk **langsung dihapus** lewat `DELETE /api/chat?chatId=…`, sehingga akun uji kembali bersih.
5. Antar-mode juga diberi jeda agar kuota per menit Voyage dan Groq pulih.

**Mode yang diuji:**

| Id mode | Nama di UI (model · mode) | Provider | Model | Thinking | Konteks |
|---|---|---|---|---|---|
| `lite` | Gemini 3.5 Flash-Lite · Kilat *(default UI)* | Gemini | `gemini-3.5-flash-lite` | Tidak | Semua potongan hasil saring (≤ 50) |
| `fast` | Gemini 2.5 Flash · Kilat *(kini 3.6 Flash, lihat 5.3b)* | Gemini | `gemini-2.5-flash` | Tidak | Semua potongan hasil saring (≤ 50) |
| `deep` | Gemini 2.5 Flash · Berpikir *(kini 3.6 Flash, lihat 5.3b)* | Gemini | `gemini-2.5-flash` | Ya | Semua potongan hasil saring (≤ 50) |
| `next` | Gemini 3.5 Flash · Berpikir | Gemini | `gemini-3.5-flash` | Ya | Semua potongan hasil saring (≤ 50) |
| `gptoss` | GPT-OSS 120B · Berpikir | Groq | `openai/gpt-oss-120b` | Ya (reasoning) | 20 potongan teratas |
| `qwen` | Qwen 3.8 · Kilat | Groq | `qwen/qwen3.8-27b` | Tidak | 20 potongan teratas |

> Saat pengujian, pemilih di UI masih berupa daftar 6 mode (Cepat, Mendalam, Kilat, Gemini 3.5 Flash, GPT-OSS 120B, Qwen 3.8). Kini UI dipisah menjadi **model** (atas) dan **mode Kilat/Berpikir** (bawah). Konfigurasi server keenam mode di atas tidak berubah, sehingga hasil pengukuran tetap berlaku. Empat kombinasi baru (`lite-think`, `next-fast`, `gptoss-fast`, `qwen-think`) belum diukur.

> Mode Groq dibatasi 20 potongan karena batas gratis Groq ±7.000–8.000 token/menit. Konteks penuh (±12–15 ribu token) ditolak dengan HTTP 413.

### 4.3 Tahap C — Uji Tombol Stop

Skrip [`e2e_stop.mjs`](scripts/e2e_stop.mjs):

1. Mencatat jumlah pesan akun uji sebelum pengujian.
2. Mengirim pertanyaan (mode `fast`).
3. Begitu event `text` pertama diterima, memanggil `AbortController.abort()`, sama seperti pengguna menekan tombol Stop.
4. Menunggu 8 dtk, memberi waktu server seandainya server keliru tetap menyimpan.
5. Menghitung ulang jumlah pesan dan chat.

**Kriteria lulus:** jumlah pesan sebelum = sesudah, dan jumlah chat = 0.

### 4.4 Pendukung: Unit Test

Perilaku yang memengaruhi waktu dan alur juga diuji otomatis dengan Jest (tanpa memanggil layanan asli):

| ID | Yang diuji |
|---|---|
| TC-CHAT-25..33 | Urutan event streaming, fallback model saat kuota habis, penyaringan potongan, cache embedding |
| TC-STOP-01 | Stream dibatalkan → AI berhenti, tidak ada riwayat yang disimpan |
| TC-GROQ-01..04 | Konteks Groq dibatasi 20 potongan, reasoning tampil, fallback ke Gemini saat 413 atau saat key tidak ada, model mode Kilat/3.5 Flash benar |

---

## 5. Hasil Pengujian

### 5.1 Tahap A — Hasil Uji Faktor

**A1. Batas request Voyage AI (tier gratis 3 RPM)**

| Panggilan ke- | Waktu | Keterangan |
|---|---|---|
| 1 | 0,57 dtk | Normal |
| 2 | 0,46 dtk | Normal |
| 3 | 0,97 dtk | Normal |
| 4 | gagal setelah ±40 dtk | 7× HTTP 429 (retry otomatis), lalu menyerah |
| 5 | 22,8 dtk | Berhasil setelah menunggu kuota pulih |

**A2. Node.js vs Python (query Pinecone)**

| Bahasa | Panggilan 1 (koneksi baru) | Panggilan 2–6 (koneksi dipakai ulang) |
|---|---|---|
| Node.js | 1,46 dtk | 0,94 · 0,34 · 0,36 · 0,33 · 0,34 dtk |
| Python 3.11 | 1,22 dtk | 0,34 · 0,35 · 0,35 · 0,30 · 0,31 dtk |

**A3. Gemini 2.5 Flash — pengaruh thinking & ukuran konteks (waktu token pertama)**

| Konteks | Thinking | Waktu token pertama |
|---|---|---|
| 50 potongan | Aktif | 3,5 dtk |
| 10 potongan | Aktif | 3,6 dtk |
| 10 potongan | Budget 512 token | 3,9 dtk |
| 10 potongan | Mati | **1,1 dtk** |
| 50 potongan | Mati | **1,7 dtk** |

**A4. Model Groq (konteks 15 potongan, waktu token pertama)**

| Model | Waktu token pertama |
|---|---|
| `openai/gpt-oss-120b` | 0,85 dtk |
| `openai/gpt-oss-20b` | 0,75 dtk |
| `qwen/qwen3.8-27b` | 0,39 dtk |

### 5.2 Tahap B — Baseline vs Sesudah Optimasi (Gemini 2.5 Flash · Berpikir)

Versi lama hanya memiliki satu mode, yaitu Gemini 2.5 Flash dengan thinking. Mode itu setara dengan **Gemini 2.5 Flash · Berpikir** sekarang (dulu bernama "Mendalam"), sehingga keduanya dibandingkan langsung.

| Pertanyaan | Versi | Teks pertama | Selesai | Kata |
|---|---|---|---|---|
| Q1 PKWT | Lama | 6,9 dtk | 8,3 dtk | — |
| Q1 PKWT | **Baru (2.5 Flash · Berpikir)** | **5,6 dtk** | **6,9 dtk** | 121 |
| Q2 Cuti tahunan | Lama | 24,6 dtk | 30,8 dtk | 596 |
| Q2 Cuti tahunan | **Baru (2.5 Flash · Berpikir)** | **16,8 dtk** | **21,8 dtk** | 461 |

| Pertanyaan | Penurunan waktu teks pertama | Penurunan waktu selesai |
|---|---|---|
| Q1 PKWT | −19% | −17% |
| Q2 Cuti tahunan | −32% | −29% |

### 5.3 Tahap B — Hasil End-to-End Keenam Mode

Diurutkan dari waktu selesai rata-rata tercepat.

| Mode | Q1 PKWT: cari / teks pertama / selesai / kata | Q2 Cuti: cari / teks pertama / selesai / kata | Rata-rata selesai |
|---|---|---|---|
| **Gemini 3.5 Flash-Lite · Kilat** | 2,0 / 3,7 / **5,3** / 155 | 0,4 / 1,5 / **3,7** / 239 | **4,5 dtk** |
| **Qwen 3.8 · Kilat** (Groq) | 1,8 / 2,8 / **4,6** / 173 | 1,9 / 3,5 / **5,7** / 192 | **5,2 dtk** |
| **GPT-OSS 120B · Berpikir** (Groq) | 2,0 / 3,7 / **5,1** / 102 | 1,6 / 3,3 / **5,3** / 199 | **5,2 dtk** |
| **Gemini 2.5 Flash · Kilat** | 4,7\* / 6,9 / **9,2** / 133 | 2,6 / 4,0 / **8,1** / 332 | **8,7 dtk** |
| **Gemini 3.5 Flash · Berpikir** | 1,9 / 10,4 / **13,0** / 169 | 1,6 / 12,1 / **15,3** / 236 | **14,2 dtk** |
| **Gemini 2.5 Flash · Berpikir** | 1,9 / 5,6 / **6,9** / 121 | 1,6 / 16,8 / **21,8** / 461 | **14,4 dtk** |

Keterangan:
- Format sel: waktu pencarian / teks pertama / selesai (dtk) / jumlah kata.
- \* Permintaan pertama sesudah server menyala. Koneksi TLS ke layanan belum terbentuk dan Voyage sedang memulihkan kuota, jadi waktu pencariannya lebih tinggi.
- Potongan yang disaring sebagai duplikat/noise: 7 (Q1) dan 10 (Q2) dari 50.
- Semua permintaan dijawab oleh model pilihan masing-masing; **tidak ada fallback** selama pengujian.

**Grafik waktu selesai rata-rata (dtk):**

```
3.5 Flash-Lite · Kilat   ████▌                4,5
Qwen 3.8 · Kilat         █████▏               5,2
GPT-OSS · Berpikir       █████▏               5,2
2.5 Flash · Kilat        ████████▋            8,7
3.5 Flash · Berpikir     ██████████████▏     14,2
2.5 Flash · Berpikir     ██████████████▍     14,4
Versi lama               ███████████████████▌ 19,6  (rata-rata 8,3 & 30,8)
```

### 5.3b Pembaruan 16 Okt 2026 — Gemini 2.5 Flash diganti Gemini 3.6 Flash

Google menutup Gemini 2.5 Flash untuk project baru (`404 — no longer available to new users`). Karena itu id mode `fast`/`deep` sekarang memakai **Gemini 3.6 Flash**. Saat pemilihan pengganti, `gemini-3.7-flash` dan `gemini-3.8-flash` selalu menolak (`503 high demand`, 6 dari 6 percobaan di 2 key), sedangkan `gemini-3.6-flash` selalu berhasil. Pengukuran memakai skrip dan pertanyaan yang sama dengan 5.3.

| Mode | Q1 PKWT: cari / teks pertama / selesai / kata | Q2 Cuti: cari / teks pertama / selesai / kata | Rata-rata selesai |
|---|---|---|---|
| **Gemini 3.6 Flash · Kilat** | 2,3 / 9,3 / **11,8** / 157 | 2,6 / 10,1 / **13,7** / 244 | **12,8 dtk** |
| **Gemini 3.6 Flash · Berpikir** | 1,9 / 10,0 / **12,8** / 205 | 1,9 / 13,8 / **17,3** / 265 | **15,1 dtk** |
| *Gemini 2.5 Flash · Kilat (sebelumnya)* | *4,7 / 6,9 / 9,2 / 133* | *2,6 / 4,0 / 8,1 / 332* | *8,7 dtk* |
| *Gemini 2.5 Flash · Berpikir (sebelumnya)* | *1,9 / 5,6 / 6,9 / 121* | *1,6 / 16,8 / 21,8 / 461* | *14,4 dtk* |

**Catatan:**
- Mode Kilat pada 3.6 Flash **lebih lambat** daripada 2.5 Flash. Seri Gemini 3 tidak menerima `thinkingBudget: 0`, sehingga mode Kilat memakai `thinkingLevel: "low"`: model tetap berpikir singkat sebelum menjawab (±400 token pada uji langsung).
- Kuota gratis 3.6 Flash hanya **20 request/hari per project**, sama dengan 2.5 Flash, sedangkan Flash-Lite 500/hari. Jika kuota habis, jawaban otomatis dibuat Flash-Lite (fallback).
- Untuk kebutuhan cepat dan hemat kuota, **Gemini 3.5 Flash-Lite · Kilat (default)** tetap pilihan terbaik.

### 5.4 Tahap C — Hasil Uji Tombol Stop

| Pengukuran | Hasil |
|---|---|
| Teks pertama diterima | 3,9 dtk |
| Stop ditekan | 3,9 dtk |
| Pesan tersimpan sebelum → sesudah | 0 → 0 |
| Chat di akun uji sesudah uji | 0 |
| **Status** | **LULUS** — AI berhenti dan tidak ada yang disimpan |

### 5.5 Unit Test

| Suite | Hasil |
|---|---|
| Seluruh test Jest (unit, integrasi, keamanan, dll.) | **231 / 231 lulus** (per 17 Okt 2026) |
| `next build` | Kompilasi berhasil |

---

## 6. Analisis

### 6.1 Urutan Faktor Penyebab Lambat (dari yang paling besar)

| # | Faktor | Dampak terukur | Bukti |
|---|---|---|---|
| 1 | **Batas Voyage gratis (3 request/menit)** | +20–40 dtk, bahkan gagal, pada request ke-4 dalam satu menit | A1 |
| 2 | **Proses berpikir (thinking)** | +2,5 dtk pada pertanyaan pendek, hingga +13–22 dtk pada pertanyaan luas | A3, 5.3 (2.5 Flash · Berpikir vs Kilat) |
| 3 | **Panjang jawaban** | Jawaban 596 kata butuh ±6 dtk streaming setelah teks pertama | 5.2 |
| 4 | **Koneksi pertama (TLS ke AS)** | ±1,2–1,5 dtk sekali per server menyala | A2 panggilan 1 |
| 5 | **Ukuran konteks** | +0,2–1 dtk (10 → 50 potongan) | A3 |
| 6 | **Baca DB berurutan** | ±0,45 dtk di produksi, sekarang dibuat paralel | Kode |
| 7 | **Latensi Pinecone** | RTT 285 ms per query | Tabel RTT |
| 8 | **Bahasa server (Node vs Python)** | ≈ 0 (keduanya ±0,33 dtk saat koneksi hangat) | A2 |

### 6.2 Temuan Utama

1. **Model bahasa dan proses berpikirnya menentukan sebagian besar waktu.** Pencarian dokumen konsisten di 0,4–2,6 dtk. Sebaliknya, waktu teks pertama berkisar dari 1,5 dtk (3.5 Flash-Lite · Kilat) sampai 16,8 dtk (2.5 Flash · Berpikir).
2. **3.5 Flash-Lite · Kilat, Qwen 3.8, dan GPT-OSS 120B rata-rata ±3× lebih cepat daripada 2.5 Flash · Berpikir** (4,5–5,2 dtk vs 14,4 dtk). Ketiganya selesai dalam 4–6 dtk untuk kedua pertanyaan.
3. **GPT-OSS 120B tetap cepat walaupun bernalar,** karena infrastruktur inferensi Groq jauh lebih cepat (A4). Kompromi-nya, konteks dibatasi 20 potongan.
4. **Migrasi pipeline ke Python tidak mempercepat apa pun** (A2). Selisihnya berada dalam batas noise jaringan, sehingga migrasi tidak direkomendasikan untuk tujuan kecepatan.
5. **Waktu 2.5 Flash · Berpikir sangat bergantung pada pertanyaan.** Pertanyaan spesifik (Q1) selesai 6,9 dtk, sedangkan pertanyaan luas (Q2) 21,8 dtk, karena model berpikir lebih lama untuk menyusun banyak poin.
6. **Aturan prompt "RINGKAS & LANGSUNG" memperpendek jawaban** dari 596 menjadi 461 kata pada Q2 (2.5 Flash · Berpikir). Ini ikut menurunkan waktu selesai.

### 6.3 Rekomendasi Pemakaian Mode

| Kebutuhan | Mode yang disarankan |
|---|---|
| Jawaban tercepat, pertanyaan sehari-hari | **Gemini 3.5 Flash-Lite · Kilat** (default) atau **Qwen 3.8 · Kilat** |
| Cepat tapi tetap bernalar | **GPT-OSS 120B · Berpikir** |
| Paling teliti, pertanyaan kompleks/lintas peraturan | **Gemini 2.5 Flash · Berpikir** atau **Gemini 3.5 Flash · Berpikir** |

Berdasarkan hasil ini, default aplikasi diubah menjadi **Gemini 3.5 Flash-Lite · Kilat** (tercepat). Mode Berpikir tetap tersedia untuk pertanyaan yang butuh ketelitian lebih. Kualitas jawaban tiap model dibandingkan di [EVALUASI_RAGAS_V3.md](EVALUASI_RAGAS_V3.md).

---

## 7. Optimasi yang Diterapkan

Semua optimasi dilakukan **tanpa mengubah skema database** dan tanpa layanan berbayar.

| Optimasi | Lokasi | Faktor yang ditangani |
|---|---|---|
| Pilihan 6 mode/model (Gemini & Groq) | `MODE_CONFIG` di `app/api/chat/route.js`, `components/features/chat/ModeToggle.jsx` | #2 thinking |
| Aturan prompt ke-5 "RINGKAS & LANGSUNG" | `buildSystemPrompt` | #3 panjang jawaban |
| Penyaringan potongan duplikat & noise OCR (5 teratas selalu dipertahankan) | `cleanMatches` | #5 ukuran konteks |
| Cache embedding (LRU per instance server) | `embedQuestion` | #1 Voyage (pertanyaan berulang tidak memanggil Voyage lagi) |
| Klien Pinecone/Voyage singleton (koneksi dipakai ulang) | `getRagClients` | #4 koneksi pertama |
| Baca DB paralel (`Promise.all`) | `POST` | #6 DB berurutan |
| Fallback otomatis ke model cadangan saat kuota habis (429/413) | `modelChainFor`, `isQuotaError` | Ketersediaan |
| Tombol Stop (membatalkan request ke model) | `ReadableStream.cancel()` → `AbortController` | Pengguna tidak perlu menunggu jawaban yang tidak diinginkan |

---

## 8. Keterbatasan Pengujian

1. **Diukur dari localhost di Indonesia, bukan dari Vercel (iad1, AS).** Di produksi, jarak server ke Pinecone dan Gemini lebih dekat, tetapi jarak server ke Supabase (Singapura) dan ke pengguna lebih jauh. Angka absolut di produksi bisa berbeda, namun urutan kecepatan antar mode diperkirakan sama.
2. **Sampel kecil.** Tiap mode diuji dengan 2 pertanyaan dan 1 kali pengulangan, karena kuota tier gratis (Voyage 3 RPM, Gemini per hari, Groq per menit) membatasi jumlah request. Hasilnya menunjukkan kecenderungan, bukan nilai statistik yang presisi.
3. **Model bahasa tidak deterministik.** Panjang jawaban dan lama berpikir dapat berbeda untuk pertanyaan yang sama, sehingga waktu selesai bisa bervariasi beberapa detik.
4. **Beban layanan eksternal berubah-ubah.** Waktu respons API gratis dipengaruhi trafik global pada saat pengujian.
5. **Uji Stop hanya dilakukan pada Gemini 2.5 Flash · Kilat.** Mekanisme pembatalannya sama untuk semua mode (`AbortController`), dan perilaku Groq juga dicakup unit test TC-STOP-01.

---

## 9. Cara Mengulang Pengujian

### Persyaratan

- File `.env.local` berisi `PINECONE_API_KEY`, `VOYAGEAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET`.
- Akun `test@mail.com` sudah ada di database.
- Server lokal menyala (jalankan `Jalankan_TanyaHukum.bat` atau `npm run dev`).

### Perintah (PowerShell, dari folder `tanyahukum/`)

```powershell
# Uji end-to-end per mode: <label> <mode> <jeda detik sebelum tiap pertanyaan>
node tests/PPL-II/scripts/e2e_response_time.mjs "Flash-Lite Kilat" lite 25
node tests/PPL-II/scripts/e2e_response_time.mjs "Qwen 3.8" qwen 25
node tests/PPL-II/scripts/e2e_response_time.mjs "GPT-OSS 120B" gptoss 25
node tests/PPL-II/scripts/e2e_response_time.mjs "2.5 Flash Kilat" fast 25
node tests/PPL-II/scripts/e2e_response_time.mjs "Gemini 3.5 Flash" next 25
node tests/PPL-II/scripts/e2e_response_time.mjs "2.5 Flash Berpikir" deep 25

# Uji tombol Stop
node tests/PPL-II/scripts/e2e_stop.mjs

# Unit test terkait
$env:NODE_OPTIONS="--experimental-vm-modules"; npx jest tests/unit/chat --config ./jest.config.js --coverage=false --reporters=default
```

### Contoh keluaran

```
Kilat                     | Berapa lama maksimal perjan | cari  2,0 dtk | teks pertama  3,7 dtk | selesai  5,3 dtk | 155 kata | disaring 7 | gemini-3.5-flash-lite
Kilat                     | Apa hak istirahat dan cuti  | cari  0,4 dtk | teks pertama  1,5 dtk | selesai  3,7 dtk | 239 kata | disaring 10 | gemini-3.5-flash-lite
(sisa chat akun uji: 0)
```

### Catatan

- Beri jeda **minimal 21 detik** antarpertanyaan (argumen ketiga) dan sekitar 1 menit antar-mode. Tanpa jeda, batas Voyage dan Groq membuat hasil melonjak.
- Mode Gemini 2.5 Flash (`fast`, `deep`) memakai kuota harian. Jangan diulang terlalu sering dalam satu hari.
- Jika `GROQ_API_KEY` tidak diset, mode `gptoss` dan `qwen` otomatis dijawab Gemini. Kolom model pada keluaran akan menunjukkan `(cadangan)`.
- Skrip tidak menyimpan rahasia apa pun; seluruh kunci dibaca dari `.env.local`.

---

## 10. Kesimpulan

1. Faktor terbesar response time adalah **batas request Voyage gratis** dan **proses berpikir model**, bukan bahasa pemrograman server atau database.
2. Sesudah optimasi, Gemini 2.5 Flash · Berpikir (default lama) menjadi **17–29% lebih cepat** daripada versi lama, dengan jawaban yang lebih ringkas.
3. Dengan pilihan model baru, pengguna bisa mendapat jawaban lengkap dalam **±4–6 dtk** (3.5 Flash-Lite · Kilat yang kini menjadi default, Qwen 3.8, GPT-OSS 120B). Untuk pertanyaan luas, ini setara penurunan hingga **±88%** dibanding versi lama (30,8 → 3,7 dtk).
4. Gemini 2.5 Flash diganti **Gemini 3.6 Flash** karena ditutup Google untuk project baru. Pengganti ini lebih lambat (selesai 12,8–15,1 dtk) dan kuotanya hanya 20/hari, sehingga cocok sebagai pilihan tambahan, bukan default.
5. Tombol **Stop** terbukti menghentikan jawaban seketika tanpa menyimpan apa pun ke riwayat.
6. Kualitas jawaban tiap model dievaluasi terpisah dengan Ragas: lihat [EVALUASI_RAGAS_V3.md](EVALUASI_RAGAS_V3.md).
