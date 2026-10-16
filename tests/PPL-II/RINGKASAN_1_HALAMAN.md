# Ringkasan Menyeluruh — TanyaHukum (Pembaruan 16 Oktober 2026)

**Lingkup:** fitur baru, perbaikan bug, dan seluruh pengujian internal (black box, white box, non-fungsional, response time, Ragas).
**Detail:** [dokumentasi_teknis_updated_16Okt.md](dokumentasi_teknis_updated_16Okt.md) beserta laporan per pengujian di folder ini.

### Fitur baru
- **Pemilih model dan mode di kotak chat.** Bagian atas memilih model (Gemini 3.5 Flash-Lite, 3.6 Flash, 3.5 Flash, GPT-OSS 120B, Qwen 3.8); bagian bawah memilih **Kilat** atau **Berpikir**. Default: Flash-Lite · Kilat.
- **Penggantian Gemini 2.5 Flash.** Model ini ditutup Google untuk project baru, jadi digantikan **Gemini 3.6 Flash**.
- **Kontrol pesan:** tombol **Stop** (jawaban yang dihentikan tidak disimpan), **Edit** pertanyaan yang dihentikan, dan **Salin** pesan.
- **Hapus semua riwayat** di Profil › Akun, dengan konfirmasi 2 langkah.
- **Personalisasi AI ala ChatGPT:** 7 dropdown (gaya bahasa, panjang, kutipan pasal, dll.), aman dari prompt injection.
- **Kebijakan Privasi dan Syarat dan Ketentuan** (ID/EN, dengan FAQ) dibuka di tab baru dari Profil › Akun.
- **Kuota harian** dicatat di tabel baru `PromptUsage`, sehingga menghapus riwayat tidak lagi mengembalikan kuota. Tidak ada data lama yang diubah atau dihapus.

### Hasil pengujian

| Pengujian | Cara | Hasil |
|---|---|---|
| Black box | 231 kasus Jest, layanan luar di-mock | **231/231 lulus** |
| White box | Coverage Istanbul + kompleksitas McCabe (ESLint) | Baris **85,1%**, cabang 74,9%, CC rata-rata 10,1 |
| E2E browser | Playwright: halaman utama, pemilih model, layar desktop/HP, halaman legal | **8/8 lulus** |
| Uji Stop end-to-end | Batalkan setelah teks pertama | **Lulus**: 0 pesan tersimpan |
| Performa endpoint | 59 request, 10 bersamaan | **0 error** |
| Response time (default) | 2 pertanyaan nyata ke API | Selesai **4,5 dtk** (versi lama 19,6 dtk, **−77%**) |
| Ragas (10 pertanyaan baru × 5 model) | API asli, juri Gemini | Faithfulness **0,956–1,000**; Answer Relevancy **0,914–0,955**; semua target lulus |

### Ragas: kualitas per model (rata-rata Faithfulness, Answer Relevancy, Answer Correctness, Factual Correctness)
Gemini 3.6 Flash · Kilat **0,883** · Gemini 3.5 Flash · Berpikir 0,881 · **Flash-Lite · Kilat (default) 0,869** · Qwen 3.8 0,868 · GPT-OSS 120B 0,823.

Retrieval: Context Precision@10 **0,754** (Eval-2: 0,554), Context Recall **0,933** (Eval-2: 0,775).

### Bug yang ditemukan & diperbaiki (tanpa mengubah data)
1. **Rate limiter:** pengguna aktif terblokir setelah 15 pertanyaan, karena TTL selalu diperpanjang.
2. **Fallback lambat:** saat kuota habis, perpindahan ke model cadangan tertahan ±100 dtk; sekarang langsung.
3. **Error tanpa fallback:** "Failed to parse stream" atau 503 tidak memicu model cadangan; sekarang memicu.
4. **Halaman chat crash** saat membuka riwayat (`reading 'text'`).
5. **Menu model keluar layar** di laptop 1280×720.
6. **Sisa kuota di panel admin** salah hitung (masih dari riwayat chat).
7. **Password ber-spasi:** pengguna yang mendaftar dengan spasi di awal/akhir password tidak bisa login.
8. **Celah kuota:** hapus riwayat atau Stop membuat bertanya tanpa batas.

### Catatan & rekomendasi
- Kuota gratis per project: **Flash-Lite 500/hari**, **Flash 20/hari**, Groq 1.000/hari. Jika kuota satu model habis, jawaban otomatis dibuat model cadangan.
- Atur `GROQ_API_KEY` di Vercel. **Rotate** key Groq dan key Gemini kedua yang sempat ditempel di chat.
- Berikutnya: tambah test untuk modul admin dan email (coverage rendah), pecah `PATCH /api/profile` dan `POST /api/chat` (CC > 20), dan rapikan judul dokumen Pinecone yang masih berupa nama file.
