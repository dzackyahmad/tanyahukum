# Evaluasi Sistem RAG dengan Ragas (v3) — TanyaHukum

> **Dokumen:** Dokumentasi Teknis PPL-II · **Tanggal pengujian:** 16 Oktober 2026
> **Objek uji:** sistem TanyaHukum versi final (pipeline retrieval + 5 model jawaban)
> **Folder kerja:** [`ragas/`](ragas/) (dataset, skrip, hasil mentah)

---

## 1. Pendahuluan

### 1.1 Tujuan

1. Mengukur kualitas jawaban sistem TanyaHukum **versi final**, setelah optimasi response time, penyaring potongan dokumen, dan aturan prompt "RINGKAS".
2. Membandingkan kualitas antar-model yang bisa dipilih pengguna, sebagai dasar memilih model default.
3. Memakai **metrik yang sama** dengan Eval-2 (Mei 2026), tetapi dengan **pertanyaan baru** agar hasilnya tidak bias terhadap pertanyaan yang pernah dipakai untuk menyetel sistem.

### 1.2 Perbedaan dengan Eval-2

| Aspek | Eval-2 (Mei 2026) | **Eval-3 (Okt 2026)** |
|---|---|---|
| Pertanyaan | 10 (naker_001–005, perdata_001–005) | **10 baru** (naker_101–105, perdata_101–105) |
| Sumber jawaban | Skrip Python terpisah (meniru pipeline) | **API aplikasi asli** (`POST /api/chat`), jadi prompt, penyaringan, dan konfigurasi model sama persis dengan yang dipakai pengguna |
| Retrieval | Top-K 10 | Top-K 50, lalu disaring (±39–50 potongan) |
| Model jawaban | Groq llama-4-scout | **5 model final:** Gemini 3.5 Flash-Lite · Kilat, Gemini 3.6 Flash · Kilat, Gemini 3.5 Flash · Berpikir, GPT-OSS 120B · Berpikir, Qwen 3.8 · Kilat |
| Juri (LLM evaluator) | Groq qwen3-32b | Gemini 3.5 Flash-Lite (temperature 0) |
| Embedding (Answer Relevancy/Correctness) | — | Gemini `gemini-embedding-001` |
| Ragas | 0.2.15 | 0.2.15 (sama) |

---

## 2. Cara Pengujian

### 2.1 Dataset

10 pertanyaan dibuat dari dokumen yang **dipastikan ada di Pinecone**. Isi potongan dokumen diambil langsung lewat query Pinecone, lalu jawaban acuan (*ground truth*) ditulis dari teks pasal tersebut. Berkas: [`ragas/test_questions_v3.json`](ragas/test_questions_v3.json).

| ID | Tingkat | Domain | Sumber | Pertanyaan (ringkas) |
|---|---|---|---|---|
| naker_101 | Easy | Ketenagakerjaan | Perda Kota Salatiga 9/2023 Pasal 39 | Batas waktu PKWT dan perpanjangannya |
| naker_102 | Medium | Ketenagakerjaan | Perda Kota Salatiga 9/2023 | Kewajiban pengusaha yang mempekerjakan perempuan pukul 23.00–07.00 |
| naker_103 | Medium | Ketenagakerjaan | Perda Kota Salatiga 9/2023 | Hak pekerja perempuan (haid, melahirkan, menyusui) dan larangan PHK |
| naker_104 | Easy | Ketenagakerjaan | PP 8/2005 | Pembentuk, tugas, dan anggota LKS Tripartit Nasional |
| naker_105 | Hard | Ketenagakerjaan | Perda 6/2023 Pelayanan Ketenagakerjaan | Waktu kerja normal, batas lembur, syarat dan kewajiban pengusaha |
| perdata_101 | Easy | Perdata | PP 37/2007 Pasal 1 | Definisi NIK, KK, dan KTP |
| perdata_102 | Medium | Perdata | PP 37/2007 Pasal 58–60 | Data pribadi penduduk dan larangan bagi pengguna/pemegang hak akses |
| perdata_103 | Easy | Perdata | PP 37/2007 Pasal 33–34 | Akta yang dapat diterbitkan Pejabat Pencatat Sipil UPTD |
| perdata_104 | Medium | Perdata | PP 37/2007 Pasal 52–53 | Hak akses dan tata cara pengusulan |
| perdata_105 | Hard | Perdata | PP 37/2007 Pasal 1, 2, 51 | Penyelenggara adminduk, SIAK, Data Center, dan alur data hak akses |

### 2.2 Alur Evaluasi

```
[1] generate_answers.mjs
    ├─ Retrieval ulang (Voyage → Pinecone topK 50 → penyaring yang sama dengan server)
    │    → konteks yang dibaca model (Gemini: semua; Groq: 20 teratas)
    ├─ POST /api/chat {stream:true, mode} ke server lokal, untuk setiap pertanyaan × model
    │    → jawaban asli aplikasi + model yang benar-benar menjawab + waktu
    └─ Chat uji dan catatan kuota akun uji langsung dihapus
[2] evaluate_ragas.py
    ├─ Metrik konteks (sekali per pertanyaan, karena retrieval sama untuk semua model)
    └─ Metrik jawaban (per pertanyaan × model)
[3] summarize.py → tabel per model, per domain, per tingkat kesulitan
```

**Kontrol kualitas data:**
- Jawaban yang **jatuh ke model cadangan** (kuota habis) atau **error** tidak dinilai sebagai model tersebut. Pertanyaan itu diulang sampai dijawab oleh model aslinya.
- Jeda antar-pertanyaan ≥ 21 dtk (batas Voyage 3 request/menit) dan 20 dtk setelah setiap model Groq (batas ±8 rb token/menit).

### 2.3 Metrik

| Kelompok | Metrik | Yang diukur | Butuh |
|---|---|---|---|
| Non-LLM | **ROUGE-L** | Kesamaan urutan kata jawaban dengan acuan | Jawaban + acuan |
| Non-LLM | **BLEU** | Kesamaan frasa (n-gram) jawaban dengan acuan | Jawaban + acuan |
| Non-LLM | **String Similarity** | Kemiripan karakter (Levenshtein) | Jawaban + acuan |
| Generasi | **Faithfulness** | Proporsi klaim dalam jawaban yang didukung konteks (anti-halusinasi) | Jawaban + konteks |
| Generasi | **Answer Relevancy** | Seberapa fokus jawaban terhadap pertanyaan | Pertanyaan + jawaban + embedding |
| Generasi | **Answer Correctness** | Kebenaran jawaban dibanding acuan (faktual + semantik) | Jawaban + acuan + embedding |
| Generasi | **Factual Correctness** | F1 klaim faktual jawaban vs acuan | Jawaban + acuan |
| Retrieval | **Context Precision@10** | Apakah potongan relevan berada di peringkat atas (10 teratas, sebanding Eval-2) | Konteks + acuan |
| Retrieval | **Context Recall** | Apakah informasi acuan ada di konteks yang dibaca model | Konteks + acuan |

### 2.4 Model yang Dievaluasi

| Model · Mode | Id mode | Konteks dibaca | Catatan |
|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | `lite` | semua (39–50 potongan) | **Default aplikasi** |
| Gemini 3.6 Flash · Kilat | `fast` | semua | Pengganti Gemini 2.5 Flash (ditutup Google untuk project baru) |
| Gemini 3.5 Flash · Berpikir | `next` | semua | Thinking aktif |
| GPT-OSS 120B · Berpikir | `gptoss` | 20 teratas | Groq, reasoning *medium* |
| Qwen 3.8 · Kilat | `qwen` | 20 teratas | Groq |

Mode lain (`lite-think`, `deep`, `next-fast`, `gptoss-fast`, `qwen-think`) belum dievaluasi karena kuota harian tier gratis.

---

## 3. Hasil Evaluasi

Semua 50 jawaban (5 model × 10 pertanyaan) dijawab oleh model aslinya, tanpa fallback. Total 331 penilaian, **0 gagal**.

### 3.1 Skor per Model (rata-rata 10 pertanyaan)

| Model · Mode | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | **Rata-rata 4 metrik LLM** | ROUGE-L | BLEU | String Sim. | Waktu jawab (median) |
|---|---|---|---|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | **1.000** | 0.931 | **0.829** | 0.771 | **0.883** | 0.558 | 0.258 | **0.450** | 11,3 dtk |
| Gemini 3.5 Flash · Berpikir | **1.000** | 0.924 | 0.804 | **0.796** | 0.881 | **0.566** | 0.261 | 0.445 | 12,6 dtk |
| Gemini 3.5 Flash-Lite · Kilat *(default)* | 0.986 | 0.914 | 0.787 | 0.789 | 0.869 | 0.546 | 0.248 | 0.430 | 6,8 dtk |
| Qwen 3.8 · Kilat | 0.986 | **0.955** | 0.796 | 0.735 | 0.868 | 0.519 | **0.301** | 0.441 | **5,1 dtk** |
| GPT-OSS 120B · Berpikir | 0.956 | 0.930 | 0.762 | 0.646 | 0.823 | 0.437 | 0.241 | 0.373 | 6,1 dtk |
| *Target (sama dengan Eval-2)* | *≥ 0.70* | *≥ 0.55* | *≥ 0.52* | *≥ 0.50* | | *≥ 0.25* | *≥ 0.10* | *≥ 0.22* | |

Waktu jawab di tabel ini adalah waktu saat membuat jawaban evaluasi (pertanyaan panjang, server lokal). Pengukuran response time terkontrol ada di [EVALUASI_RESPONSE_TIME.md](EVALUASI_RESPONSE_TIME.md).

**Semua model melewati target di semua metrik.**

### 3.2 Skor Retrieval (sama untuk semua model)

| Metrik | Skor | Target | Eval-2 |
|---|---|---|---|
| Context Precision@10 | **0.754** | ≥ 0.60 | 0.554 |
| Context Recall — model Gemini (semua potongan hasil saring) | **0.933** | ≥ 0.60 | 0.775 |
| Context Recall — model Groq (20 potongan teratas) | 0.858 | ≥ 0.60 | — |

### 3.3 Answer Correctness per Domain dan Tingkat Kesulitan

| Model · Mode | Ketenagakerjaan | Perdata | Easy | Medium | Hard |
|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | **0.892** | 0.767 | 0.838 | 0.755 | **0.961** |
| Gemini 3.5 Flash · Berpikir | 0.829 | 0.779 | 0.778 | 0.793 | 0.879 |
| Gemini 3.5 Flash-Lite · Kilat | 0.785 | 0.789 | **0.860** | 0.656 | 0.903 |
| Qwen 3.8 · Kilat | 0.786 | **0.806** | 0.717 | **0.809** | 0.929 |
| GPT-OSS 120B · Berpikir | 0.747 | 0.776 | 0.746 | 0.771 | 0.774 |

### 3.4 Per Pertanyaan

Kolom model berisi Answer Correctness. CP = Context Precision@10, CR = Context Recall.

| ID | 3.5 Flash-Lite · Kilat | 3.6 Flash · Kilat | 3.5 Flash · Berpikir | GPT-OSS · Berpikir | Qwen · Kilat | CP@10 | CR Gemini | CR Groq |
|---|---|---|---|---|---|---|---|---|
| naker_101 | 0.820 | 0.865 | 0.798 | 0.628 | 0.558 | 1.000 | 1.000 | 0.250 |
| naker_102 | 0.661 | 0.877 | 0.782 | 0.782 | 0.867 | 1.000 | 0.333 | 0.333 |
| naker_103 | 0.758 | 0.906 | 0.872 | 0.712 | 0.828 | 0.333 | 1.000 | 1.000 |
| naker_104 | 0.870 | 0.881 | 0.928 | 0.629 | 0.738 | 0.500 | 1.000 | 1.000 |
| naker_105 | 0.814 | 0.928 | 0.766 | 0.987 | 0.941 | 0.250 | 1.000 | 1.000 |
| perdata_101 | 0.886 | 0.744 | 0.524 | 0.992 | 0.703 | 1.000 | 1.000 | 1.000 |
| perdata_102 | 0.614 | 0.645 | 0.612 | 0.860 | 0.879 | 1.000 | 1.000 | 1.000 |
| perdata_103 | 0.863 | 0.862 | 0.862 | 0.736 | 0.869 | 1.000 | 1.000 | 1.000 |
| perdata_104 | 0.592 | 0.590 | 0.904 | 0.732 | 0.663 | 0.625 | 1.000 | 1.000 |
| perdata_105 | 0.992 | 0.994 | 0.992 | 0.562 | 0.917 | 0.833 | 1.000 | 1.000 |

Data lengkap per sampel: [`ragas/results/scores_v3.json`](ragas/results/scores_v3.json); rekap otomatis: [`ragas/results/summary_v3.md`](ragas/results/summary_v3.md).

---

## 4. Analisis

1. **Hampir tanpa halusinasi.** Faithfulness 0.956–1.000 di semua model: hampir setiap klaim dalam jawaban didukung dokumen. Aturan prompt "jawab HANYA dari dokumen" bekerja.
2. **Jawaban fokus.** Answer Relevancy naik dari 0.425 (Eval-2) menjadi 0.914–0.955. Penyebab utamanya aturan prompt "RINGKAS & LANGSUNG" dan model yang lebih baru.
3. **Selisih kualitas antar-model kecil.** Rentang rata-rata 4 metrik LLM 0.823–0.883. Gemini 3.6 Flash dan 3.5 Flash · Berpikir tertinggi (±0.88), tetapi 1,7–1,9× lebih lambat dan kuotanya hanya 20 request/hari.
4. **Default Flash-Lite · Kilat terbukti tepat.** Skornya 0.869, hanya 0.014 di bawah model terbaik, sementara median waktunya 6,8 dtk dan kuotanya 500 request/hari (25× lebih banyak).
5. **Model Groq dirugikan oleh batas 20 potongan.** Context Recall Groq 0.858 vs 0.933 untuk Gemini. Contoh paling jelas: naker_101 (recall 0.25 vs 1.00), di mana ketentuan pemberitahuan 7 hari dan pelaporan PKWT berada di luar 20 potongan teratas. Factual Correctness GPT-OSS paling rendah (0.646), karena ia cenderung merangkum ulang sehingga beberapa angka/detail acuan tidak disebut.
6. **Retrieval membaik.** Context Precision@10 naik dari 0.554 menjadi 0.754 dan Context Recall dari 0.775 menjadi 0.933. Perbaikan datang dari topK 50, penyaring potongan noise, dan dataset yang hanya memakai dokumen yang terverifikasi ada di Pinecone. Titik lemah: naker_102 (recall 0.333; daftar sanksi dan isi laporan tidak terambil) serta precision rendah pada naker_103 dan naker_105 (potongan relevan tidak di peringkat atas).
7. **Skor correctness rendah tidak selalu berarti salah.** Contohnya perdata_104 (Flash-Lite 0.592): jawabannya benar tetapi memuat informasi tambahan dari dokumen (ruang lingkup hak akses) yang tidak ada di acuan, sehingga presisi klaim terhadap acuan turun.

## 5. Perbandingan dengan Eval-2

| Metrik | Eval-2 (Mei 2026) | Eval-3 — default Flash-Lite · Kilat | Eval-3 — terbaik |
|---|---|---|---|
| Faithfulness | 0.881 | 0.986 | 1.000 |
| Answer Relevancy | 0.425 | 0.914 | 0.955 (Qwen) |
| Context Precision | 0.554 | 0.754 | 0.754 |
| Context Recall | 0.775 | 0.933 | 0.933 |
| Answer Correctness | 0.651 | 0.787 | 0.829 (3.6 Flash) |
| Factual Correctness | 0.475 | 0.789 | 0.796 (3.5 Flash) |

> **Catatan:** perbandingan ini menunjukkan arah perbaikan, bukan selisih yang presisi. Pertanyaan, model juri, dan model jawaban berbeda antara Eval-2 dan Eval-3.

## 6. Keterbatasan

1. **Juri juga salah satu model yang dinilai.** Gemini 3.5 Flash-Lite dipakai sebagai juri karena kuota gratisnya terbesar, sehingga ada kemungkinan bias menilai jawabannya sendiri lebih tinggi. Skor Flash-Lite tidak tertinggi, jadi bias ini tampaknya kecil.
2. **Dataset 10 pertanyaan** dari 2 domain dan 4 dokumen. Jawaban acuan ditulis penguji dari teks pasal dan tidak selalu memuat semua informasi yang relevan (lihat analisis no. 7).
3. **Prompt bawaan Ragas berbahasa Inggris**, sedangkan teks yang dinilai berbahasa Indonesia.
4. **Satu kali jalan per sampel.** Model bahasa tidak deterministik, jadi skor dapat bergeser beberapa poin bila diulang.
5. **Context Precision dihitung pada 10 potongan teratas** (agar sebanding dengan Eval-2), bukan seluruh 39–50 potongan yang dibaca model Gemini.
6. **Kendala kuota selama evaluasi:** kuota harian Flash-Lite key utama (500/hari) habis di tengah penilaian, lalu dilanjutkan dengan key kedua dari project lain (model juri sama, parameter sama). Gemini 2.5 Flash tidak bisa dievaluasi karena ditutup untuk project baru dan kuota harian key lama habis, sehingga digantikan 3.6 Flash.

## 7. Cara Mengulang

```powershell
# dari folder tanyahukum/, server lokal menyala (npm run dev / Jalankan_TanyaHukum.bat)
node tests/PPL-II/ragas/generate_answers.mjs lite,fast,next,gptoss,qwen
tests/PPL-II/ragas/.venv/Scripts/python tests/PPL-II/ragas/evaluate_ragas.py
tests/PPL-II/ragas/.venv/Scripts/python tests/PPL-II/ragas/summarize.py
```

- Kedua skrip bisa dihentikan dan dilanjutkan: hasil disimpan bertahap, dan yang sudah selesai tidak diulang.
- Jika `GOOGLE_API_KEY_EVAL` (key dari project lain) diisi di `.env.local`, juri berjalan bergantian di dua key (2 × 15 request/menit). `RAGAS_ONLY_EVAL_KEY=1` memakai key kedua saja.
- Perkiraan pemakaian kuota: ±12 request juri per jawaban + ±12 per pertanyaan untuk metrik konteks, yaitu ±650 request untuk 5 model × 10 pertanyaan.

## 8. Kesimpulan

1. Sistem RAG TanyaHukum versi final **melewati semua target Ragas** pada kelima model. Faithfulness ≥ 0.956 dan Answer Relevancy ≥ 0.914, jauh di atas Eval-2.
2. **Gemini 3.5 Flash-Lite · Kilat layak menjadi default**: kualitasnya hampir sama dengan model terbaik (0.869 vs 0.883), paling hemat kuota, dan termasuk yang tercepat.
3. Untuk pertanyaan yang butuh ketelitian maksimal, **Gemini 3.6 Flash** dan **Gemini 3.5 Flash · Berpikir** memberi skor tertinggi.
4. Prioritas perbaikan berikutnya:
   - menaikkan batas konteks Groq bila kuota memungkinkan;
   - memperbaiki judul dokumen di Pinecone yang masih berupa nama file (mis. "2023pd3332009");
   - menambah pertanyaan uji dari domain lain.

## 9. Evaluasi Lanjutan (27 Oktober 2026): 5 Mode Tambahan

### 9.1 Yang diuji

Lima kombinasi model–mode yang belum dievaluasi di atas, sehingga kelima model kini diuji di **kedua mode** (10 kombinasi):

| Model | Mode baru | Soal dinilai | Catatan |
|---|---|---|---|
| Gemini 3.5 Flash-Lite | Berpikir | 10 | |
| Gemini 3.6 Flash | Berpikir | 10 | perdata_105 sempat jatuh ke model cadangan (kuota harian habis), dilengkapi di putaran kedua |
| Gemini 3.5 Flash | Kilat | 10 | perdata_104 & perdata_105 sempat jatuh ke model cadangan, dilengkapi di putaran kedua |
| GPT-OSS 120B | Kilat | 10 | |
| Qwen 3.8 | Berpikir | 10 | naker_105 berhasil pada percobaan ulang |

Dataset, konteks, juri (Gemini 3.5 Flash-Lite, temperature 0), embedding, dan prompt aplikasi **sama persis** dengan evaluasi di atas, sehingga skornya sebanding. Jawaban diambil dengan kode chat sebelum perubahan prompt v8 (guardrail & keamanan AI). Total 350 penilaian baru, 0 gagal.

Pelaksanaan dalam dua putaran:

1. **Putaran pertama:** 47 jawaban, 329 penilaian. Kuota harian juri di `GOOGLE_API_KEY_EVAL` habis pada penilaian ke-295; sisanya dilanjutkan dengan `GOOGLE_API_KEY` (model dan parameter juri sama). Tiga jawaban jatuh ke model cadangan karena kuota harian Gemini 3.6 Flash / 3.5 Flash habis, sehingga tidak dinilai.
2. **Putaran kedua (melengkapi):** tiga jawaban yang kurang (perdata_105 · 3.6 Flash Berpikir; perdata_104 & perdata_105 · 3.5 Flash Kilat) diambil ulang dengan API key Gemini dari project baru, lalu dinilai 21 penilaian dengan key yang sama. Selama pengambilan, route chat dikembalikan sementara ke versi sebelum v8 agar prompt sama dengan 47 jawaban lainnya; route v8 dipulihkan segera sesudahnya (diverifikasi identik). Ketiga jawaban benar-benar dari model yang dimaksud (log: `gemini-3.6-flash`, `gemini-3.5-flash`), bukan cadangan.

### 9.2 Skor 10 kombinasi (rata-rata per mode)

| Model · Mode | n | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | Rata-rata 4 metrik | Waktu rata-rata |
|---|---|---|---|---|---|---|---|
| Gemini 3.6 Flash · Kilat | 10 | 1,000 | 0,931 | 0,829 | 0,771 | **0,883** | 17,3 dtk |
| Gemini 3.5 Flash · Kilat *(baru)* | 10 | 1,000 | 0,928 | 0,822 | 0,776 | **0,881** | 11,9 dtk |
| Gemini 3.5 Flash · Berpikir | 10 | 1,000 | 0,924 | 0,804 | 0,796 | **0,881** | 12,1 dtk |
| Gemini 3.5 Flash-Lite · Berpikir *(baru)* | 10 | 1,000 | 0,906 | 0,811 | 0,771 | **0,872** | 9,5 dtk |
| Gemini 3.5 Flash-Lite · Kilat | 10 | 0,986 | 0,914 | 0,787 | 0,789 | **0,869** | 7,2 dtk |
| Qwen 3.8 · Kilat | 10 | 0,986 | 0,955 | 0,796 | 0,735 | **0,868** | 5,0 dtk |
| Gemini 3.6 Flash · Berpikir *(baru)* | 10 | 1,000 | 0,931 | 0,792 | 0,723 | **0,862** | 16,7 dtk |
| GPT-OSS 120B · Berpikir | 10 | 0,956 | 0,930 | 0,762 | 0,646 | **0,823** | 5,8 dtk |
| Qwen 3.8 · Berpikir *(baru)* | 10 | 0,978 | 0,945 | 0,673 | 0,655 | **0,813** | 5,8 dtk |
| GPT-OSS 120B · Kilat *(baru)* | 10 | 0,948 | 0,913 | 0,730 | 0,646 | **0,809** | 5,5 dtk |
| *Target* | | *≥ 0,70* | *≥ 0,55* | *≥ 0,52* | *≥ 0,50* | | |

Semua 10 kombinasi melewati target di semua metrik. Skor lengkap (ROUGE-L, BLEU, String Similarity, per domain, per tingkat kesulitan, per pertanyaan) ada di `ragas/results/summary_v3.md`.

Answer Correctness per domain untuk mode baru:

| Model · Mode | Ketenagakerjaan | Perdata |
|---|---|---|
| Gemini 3.5 Flash-Lite · Berpikir | 0,837 | 0,785 |
| Gemini 3.6 Flash · Berpikir | 0,793 | 0,792 |
| Gemini 3.5 Flash · Kilat | 0,863 | 0,780 |
| GPT-OSS 120B · Kilat | 0,767 | 0,693 |
| Qwen 3.8 · Berpikir | 0,702 | 0,645 |

### 9.3 Temuan

1. **Mode Berpikir tidak otomatis lebih baik.** Gemini 3.6 Flash Berpikir (0,862) dan Qwen 3.8 Berpikir (0,813) justru lebih rendah dari mode Kilat-nya (0,883 dan 0,868). Penurunan terbesar ada di Factual Correctness: jawaban mode Berpikir cenderung menambahkan kesimpulan di luar jawaban acuan.
2. **Flash-Lite Berpikir sedikit lebih baik dari Kilat** (0,872 vs 0,869), dengan waktu +2,3 dtk. Selisihnya masih dalam batas wajar acak untuk 10 soal.
3. **Gemini 3.5 Flash Kilat setara dengan mode Berpikir-nya** (0,881 vs 0,881) dan sedikit lebih cepat (11,9 vs 12,1 dtk).
4. **GPT-OSS 120B tetap terendah** di kedua mode, terutama Factual Correctness (0,646).
5. Faithfulness semua mode ≥ 0,948: tidak ada mode yang cenderung mengarang di luar dokumen.

### 9.4 Urutan prioritas fallback

Hasil ini dipakai untuk urutan model cadangan otomatis (`lib/modelRouter.js` → `DEFAULT_MODE_PRIORITY`). Aturan: rata-rata 4 metrik dibulatkan 2 desimal (selisih < 0,01 pada 10 soal dianggap setara), lalu yang lebih cepat didahulukan.

| Urutan | Mode | Skor (dibulatkan) | Waktu |
|---|---|---|---|
| 1 | Gemini 3.5 Flash · Kilat | 0,88 | 11,9 dtk |
| 2 | Gemini 3.5 Flash · Berpikir | 0,88 | 12,1 dtk |
| 3 | Gemini 3.6 Flash · Kilat | 0,88 | 17,3 dtk |
| 4 | Qwen 3.8 · Kilat | 0,87 | 5,0 dtk |
| 5 | Gemini 3.5 Flash-Lite · Kilat | 0,87 | 7,2 dtk |
| 6 | Gemini 3.5 Flash-Lite · Berpikir | 0,87 | 9,5 dtk |
| 7 | Gemini 3.6 Flash · Berpikir | 0,86 | 16,7 dtk |
| 8 | GPT-OSS 120B · Berpikir | 0,82 | 5,8 dtk |
| 9 | GPT-OSS 120B · Kilat | 0,81 | 5,5 dtk |
| 10 | Qwen 3.8 · Berpikir | 0,81 | 5,8 dtk |

Cara pakainya: model pilihan pengguna selalu dicoba pertama. Cadangan diambil dari urutan di atas, dengan jenis mode yang sama (Kilat/Berpikir) didahulukan; satu model hanya dicoba sekali karena batas kuota berlaku per model. Contoh untuk default Flash-Lite · Kilat: Flash-Lite → 3.5 Flash Kilat → 3.6 Flash Kilat → Qwen Kilat → GPT-OSS Kilat. Urutan bisa diubah tanpa mengubah kode lewat env `MODEL_PRIORITY` (daftar id mode dipisah koma).

Setelah putaran kedua (semua mode n=10), aturan yang sama menghasilkan **urutan yang sama persis** dengan hasil putaran pertama, sehingga `DEFAULT_MODE_PRIORITY` tidak diubah.

### 9.5 Keterbatasan tambahan

- Tiga jawaban putaran kedua diambil dengan API key dari project Google yang berbeda. Model, parameter, prompt, dan konteksnya sama, sehingga hasilnya tetap sebanding; perbedaannya hanya kuota.
- Gemini 3.6 Flash dan 3.5 Flash punya kuota harian gratis yang kecil (habis selama evaluasi). Di urutan fallback keduanya ada di atas karena skornya; bila kuotanya habis, cooldown otomatis melewatinya ke model berikutnya.
- Jawaban dinilai dengan prompt sebelum v8. Prompt v8 menambah aturan keamanan & guardrail yang sama untuk semua model, sehingga urutan relatif diperkirakan tidak berubah, tetapi skor absolut belum diukur ulang.
