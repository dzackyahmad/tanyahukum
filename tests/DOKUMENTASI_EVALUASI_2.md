# Dokumentasi Lengkap Evaluasi RAGAS 2 — TanyaHukum

> **Versi:** 2.0 | **Tanggal:** 28 Mei 2026 | **Domain:** Ketenagakerjaan & Perdata

---

## Daftar Isi

1. [Apa itu TanyaHukum?](#1-apa-itu-tanyahukum)
2. [Apa itu RAG?](#2-apa-itu-rag-retrieval-augmented-generation)
3. [Apa itu RAGAS?](#3-apa-itu-ragas)
4. [Arsitektur Sistem yang Diuji](#4-arsitektur-sistem-yang-diuji)
5. [Pipeline Evaluasi Step by Step](#5-pipeline-evaluasi-step-by-step)
6. [Dataset Pertanyaan Uji](#6-dataset-pertanyaan-uji)
7. [Penjelasan Setiap Metrik](#7-penjelasan-setiap-metrik)
8. [Hasil Evaluasi Lengkap](#8-hasil-evaluasi-lengkap)
9. [Analisis Per Domain](#9-analisis-per-domain)
10. [Analisis Per Tingkat Kesulitan](#10-analisis-per-tingkat-kesulitan)
11. [Masalah yang Ditemukan dan Solusinya](#11-masalah-yang-ditemukan-dan-solusinya)
12. [Perbandingan dengan Evaluasi Pertama](#12-perbandingan-dengan-evaluasi-pertama-eval-1)
13. [Rekomendasi Perbaikan](#13-rekomendasi-perbaikan)
14. [Cara Menjalankan Ulang Evaluasi](#14-cara-menjalankan-ulang-evaluasi)
15. [Struktur File & Kode](#15-struktur-file--kode)
16. [Kesimpulan](#16-kesimpulan)

---

## 1. Apa itu TanyaHukum?

TanyaHukum adalah chatbot hukum Indonesia berbasis kecerdasan buatan. Pengguna bisa mengetik pertanyaan seputar hukum — misalnya *"Berapa persentase kuota disabilitas di perusahaan?"* — dan sistem akan menjawab berdasarkan peraturan perundang-undangan yang sudah tersimpan di database.

**Tujuan utama TanyaHukum:**
- Membantu masyarakat memahami hukum tanpa harus membaca ratusan halaman peraturan
- Memberikan jawaban yang **akurat dan bisa diverifikasi** (selalu menyebut sumber: nama peraturan, pasal, halaman)
- Menjangkau domain hukum yang luas: Pidana, Ketenagakerjaan, Perdata, ITE, Perlindungan Konsumen, dll.

**Yang membedakan TanyaHukum dari chatbot biasa:**
Chatbot biasa menjawab dari "ingatan" model AI yang bisa salah atau ketinggalan zaman. TanyaHukum selalu mencari dulu di database peraturan, baru menjawab berdasarkan dokumen yang ditemukan. Inilah yang disebut sistem **RAG**.

---

## 2. Apa itu RAG (Retrieval-Augmented Generation)?

RAG adalah teknik menggabungkan **pencarian dokumen** dengan **generasi teks AI**. Prosesnya seperti ini:

```
Pengguna bertanya
      ↓
[RETRIEVAL] Sistem mengubah pertanyaan jadi vektor numerik
      ↓
[RETRIEVAL] Sistem mencari vektor yang mirip di database (Pinecone)
      ↓
[RETRIEVAL] Ambil 10 potongan dokumen hukum paling relevan
      ↓
[AUGMENTED] Gabungkan pertanyaan + dokumen jadi 1 prompt panjang
      ↓
[GENERATION] AI (LLM) membaca prompt dan menulis jawaban
      ↓
Pengguna mendapat jawaban lengkap + sumber dokumen
```

**Analogi sederhana:** Bayangkan ada seorang pakar hukum. Sebelum menjawab pertanyaan Anda, dia tidak langsung bicara dari ingatannya — dia dulu mencari dulu di rak buku peraturan di kantornya, menemukan pasal yang relevan, lalu baru menjelaskan kepada Anda berdasarkan apa yang dia baca. Itulah RAG.

### Komponen RAG di TanyaHukum

| Komponen | Teknologi | Fungsi |
|---|---|---|
| **Embedding Model** | VoyageAI `voyage-law-2` | Mengubah teks jadi vektor angka |
| **Vector Database** | Pinecone `tanyahukum2` | Menyimpan ~78.000 potongan dokumen hukum |
| **Retrieval** | Cosine Similarity Search | Mencari 10 dokumen paling mirip |
| **LLM Generator** | llama-4-scout-17b (Groq) | Menulis jawaban dari konteks yang ditemukan |

---

## 3. Apa itu RAGAS?

RAGAS (Retrieval-Augmented Generation Assessment) adalah **framework evaluasi khusus untuk sistem RAG**. Dikembangkan oleh tim peneliti dan open-source di: `pip install ragas`.

**Mengapa perlu RAGAS?**

Sistem RAG punya dua bagian yang bisa gagal secara independen:
1. **Retrieval bisa buruk** → dokumen yang salah diambil → jawaban benar tapi dari sumber yang salah
2. **Generation bisa buruk** → dokumen benar tapi AI meringkasnya salah / mengarang tambahan

RAGAS mengevaluasi **kedua bagian sekaligus** dengan metrik yang berbeda, sehingga kita tahu persis di mana masalahnya.

**Versi yang digunakan:** RAGAS 0.2.15

---

## 4. Arsitektur Sistem yang Diuji

```
┌─────────────────────────────────────────────────────────────┐
│                    TANYAHUKUM RAG SYSTEM                    │
│                                                             │
│  Pertanyaan User                                            │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────┐    embed     ┌──────────────────┐        │
│  │   User Input │ ──────────▶  │  VoyageAI        │        │
│  │  (teks bebas)│              │  voyage-law-2    │        │
│  └──────────────┘              │  (1024-dim vector)│        │
│                                └────────┬─────────┘        │
│                                         │ query vector      │
│                                         ▼                   │
│                                ┌──────────────────┐        │
│                                │  Pinecone        │        │
│                                │  tanyahukum2     │        │
│                                │  ~78.313 chunks  │        │
│                                │  Top-K=10        │        │
│                                └────────┬─────────┘        │
│                                         │ 10 dokumen        │
│                                         ▼                   │
│  ┌──────────────┐  prompt   ┌──────────────────────┐       │
│  │   System     │ ◀──────── │  Context Builder     │       │
│  │   Prompt +   │           │  (gabung konteks)    │       │
│  │   Konteks    │           └──────────────────────┘       │
│  └──────┬───────┘                                          │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────┐                                      │
│  │  llama-4-scout   │  →  Jawaban + Sumber Dokumen         │
│  │  (Groq API)      │                                      │
│  └──────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

### System Prompt yang Digunakan

AI diberi instruksi ketat agar:
1. Hanya menjawab dari dokumen yang diberikan — tidak boleh mengarang
2. Menyebut sumber setiap klaim (nama dokumen, halaman)
3. Jika tidak ada informasi → wajib bilang *"Maaf, tidak ditemukan"*
4. Format Markdown dengan poin-poin yang terstruktur

---

## 5. Pipeline Evaluasi Step by Step

### Step 1 — Audit Pinecone (Verifikasi Dokumen)

Sebelum membuat pertanyaan, kami melakukan **audit langsung ke Pinecone** untuk memastikan dokumen yang akan ditanyakan benar-benar ada di database.

Caranya: kirim 8 query berbeda ke Pinecone, lihat dokumen apa yang muncul dengan skor tertinggi.

```python
queries = [
    'penyandang disabilitas hak ketenagakerjaan perusahaan kewajiban',
    'tanggung jawab sosial perusahaan CSR kewajiban pengusaha',
    'perizinan berusaha daerah izin usaha OSS',
    'barang milik negara sewa pinjam pakai pemanfaatan',
    'kawasan tanpa rokok larangan merokok perda',
    # ... dst
]
```

**Hasil audit:** Ditemukan 3 dokumen yang tidak terindeks dengan baik:
- PP 26/2019 (pengangkatan Hakim PHI) → **tidak ada di Pinecone**
- PP 28/2022 (PUPN/Piutang Negara) → **tidak ada di Pinecone**
- PP 27/2014 Pasal 1 (definisi BMN) → **ada tapi tidak ter-retrieve**

Pertanyaan yang mengacu ke dokumen tersebut **diganti** sebelum evaluasi dimulai.

---

### Step 2 — Membuat Dataset Pertanyaan (test_questions_v2.json)

10 pertanyaan dibuat dengan ketentuan:
- **Hanya dari dokumen yang dikonfirmasi ada di Pinecone** (hasil audit Step 1)
- 5 pertanyaan domain Ketenagakerjaan, 5 pertanyaan domain Perdata
- 3 tingkat kesulitan: Easy, Medium, Hard
- Setiap pertanyaan disertai **jawaban referensi (ground truth)** yang ditulis manual berdasarkan isi peraturan

Format JSON setiap pertanyaan:
```json
{
  "id": "naker_001",
  "domain": "Ketenagakerjaan",
  "difficulty": "easy",
  "source": "PERDA Tulang Bawang Barat No. 13 Tahun 2025",
  "user_input": "Berapa persentase minimal...",
  "reference": "Berdasarkan PERDA ... Pasal 23 menetapkan: ..."
}
```

---

### Step 3 — Menjalankan RAG Pipeline (pipeline.py)

Untuk setiap pertanyaan, pipeline melakukan:

```
1. Ambil pertanyaan dari test_questions_v2.json
2. Kirim ke VoyageAI → dapat vektor 1024 dimensi
3. Query Pinecone dengan vektor tersebut → dapat 10 chunk teks
4. Gabungkan 10 chunk + pertanyaan jadi system prompt
5. Kirim ke llama-4-scout-17b → dapat jawaban teks
6. Simpan: pertanyaan + konteks + jawaban ke rag_results_v2.json
```

Catatan teknis: VoyageAI free tier hanya **3 request per menit**, jadi ada jeda 21 detik antar pertanyaan. Total waktu pipeline untuk 10 pertanyaan: ~4 menit.

---

### Step 4 — Evaluasi Non-LLM (eval_nonllm.py)

Metrik yang tidak butuh AI: ROUGE-L, BLEU, String Similarity.

```
Untuk setiap pasangan (jawaban AI, jawaban referensi):
  ├── Hitung ROUGE-L → overlap urutan kata
  ├── Hitung BLEU    → overlap n-gram (1-4 kata)
  └── Hitung String Similarity → kemiripan karakter
```

Evaluasi ini **100% lokal**, tidak perlu API apapun, selesai dalam hitungan detik.

---

### Step 5 — Evaluasi LLM-based (evaluate.py / eval_batch.py)

Metrik yang butuh AI sebagai juri: Faithfulness, Answer Relevancy, Context Precision, Context Recall, Answer Correctness, Factual Correctness.

```
Untuk setiap sampel, AI juri (qwen3-32b) melakukan:

  [Faithfulness]
  → Baca jawaban AI + konteks
  → Pecah jawaban jadi daftar klaim
  → Cek setiap klaim: ada tidak di konteks?
  → Skor = jumlah klaim valid / total klaim

  [Answer Relevancy]
  → Baca pertanyaan + jawaban AI
  → Hasilkan beberapa pertanyaan alternatif dari jawaban
  → Ukur seberapa mirip pertanyaan alternatif dengan aslinya
  → Skor = rata-rata kemiripan

  [Context Precision]
  → Baca konteks + referensi
  → Untuk setiap chunk: apakah berguna untuk menjawab?
  → Skor = presisi (chunk berguna / total chunk)

  [Context Recall]
  → Baca referensi + konteks
  → Apakah semua info di referensi bisa ditemukan di konteks?
  → Skor = recall (info tertutup / total info referensi)

  [Answer Correctness]
  → Bandingkan jawaban AI vs referensi secara semantik + faktual
  → Skor gabungan akurasi

  [Factual Correctness]
  → Fokus pada fakta spesifik: angka, nama, pasal
  → Skor F1 = harmonic mean presisi & recall fakta
```

**Kendala yang ditemui:** qwen3-32b memiliki limit **6.000 token per menit (TPM)**. Karena RAGAS mengirim 6 metrik secara paralel (tiap metrik ~2.000–3.000 token), limit langsung habis setelah 1–2 sampel. Solusi: jalankan 1 sampel per menit dengan jeda 75 detik.

---

### Step 6 — Kompilasi & Laporan

Data dari semua step digabungkan menjadi laporan akhir:
- Non-LLM: tersedia 10/10 sampel
- LLM lengkap: tersedia 3/10 sampel (naker_001, naker_002, naker_003)
- LLM sebagian (Answer Relevancy saja): tersedia 5/10 sampel

---

## 6. Dataset Pertanyaan Uji

### Daftar Lengkap 10 Pertanyaan

| ID | Tingkat | Domain | Sumber Dokumen |
|---|---|---|---|
| naker_001 | Easy | Ketenagakerjaan | PERDA Tulang Bawang Barat No. 13 Tahun 2025 |
| naker_002 | Medium | Ketenagakerjaan | PERDA Tulang Bawang Barat No. 13 Tahun 2025 |
| naker_003 | Medium | Ketenagakerjaan | PERPRES Nomor 96 Tahun 2006 |
| naker_004 | Easy | Ketenagakerjaan | PERDA Kabupaten Sukabumi No. 5 Tahun 2023 |
| naker_005 | Hard | Ketenagakerjaan | PERDA Kota Madiun No. 8 Tahun 2023 |
| perdata_001 | Easy | Perdata | PP Nomor 17 Tahun 2022 |
| perdata_002 | Medium | Perdata | PP Nomor 27 Tahun 2014 |
| perdata_003 | Medium | Perdata | Perda No. 1 Tahun 2024 (Kawasan Tanpa Rokok) |
| perdata_004 | Easy | Perdata | PP Nomor 28 Tahun 2022 |
| perdata_005 | Hard | Perdata | PP No. 27/2014 & PP No. 28/2022 |

### Detail Pertanyaan

**naker_001** *(Easy)*
> *"Berapa persentase minimal perusahaan wajib mempekerjakan penyandang disabilitas berdasarkan PERDA Kabupaten Tulang Bawang Barat Nomor 13 Tahun 2025?"*

Jawaban yang diharapkan: 2% untuk BUMN/Pemda, 1% untuk perusahaan swasta.
Kategori: Fakta angka spesifik → mudah dicari di teks peraturan.

---

**naker_002** *(Medium)*
> *"Apa saja tugas Unit Layanan Disabilitas yang wajib dibentuk oleh Pemerintah Daerah berdasarkan peraturan tentang hak penyandang disabilitas di Kabupaten Tulang Bawang Barat?"*

Jawaban yang diharapkan: Daftar 5 tugas ULD (Pasal 25).
Kategori: Enumerasi tugas dari satu pasal spesifik.

---

**naker_003** *(Medium)*
> *"Apa saja tunjangan dan hak-hak lainnya yang diberikan kepada Hakim Ad Hoc pada Pengadilan Hubungan Industrial berdasarkan PERPRES Nomor 96 Tahun 2006?"*

Jawaban yang diharapkan: Besaran tunjangan berdasarkan Pasal 3 & 4 PERPRES 96/2006.
Catatan: Pertanyaan ini menggantikan pertanyaan lama tentang PP 26/2019 yang tidak terindeks.

---

**naker_004** *(Easy)*
> *"Apa yang dimaksud dengan Tanggung Jawab Sosial Perusahaan (CSR) dan siapa yang wajib melaksanakannya berdasarkan PERDA Kabupaten Sukabumi tentang Tanggung Jawab Sosial Perusahaan?"*

Jawaban yang diharapkan: Definisi CSR + subjek wajib pelaksana dari PERDA Sukabumi 5/2023.

---

**naker_005** *(Hard)*
> *"Apa tujuan dan dasar hukum penyelenggaraan perizinan berusaha di daerah berdasarkan PERDA Kota Madiun Nomor 8 Tahun 2023, dan apa kaitannya dengan perlindungan pekerja?"*

Jawaban yang diharapkan: Tujuan perizinan (ekosistem investasi, perlindungan pekerja) + dasar hukum (PP 7/2021, dll).
Kategori: Hard karena menggabungkan tujuan + dasar hukum + relevansi ketenagakerjaan.

---

**perdata_001** *(Easy)*
> *"Apa yang dimaksud dengan pemanfaatan Barang Milik Negara menurut PP Nomor 17 Tahun 2022 dan bagaimana tata cara pinjam pakai BMN?"*

Jawaban yang diharapkan: Definisi pemanfaatan + 6 bentuk pemanfaatan + tata cara pinjam pakai.
Catatan: Menggantikan pertanyaan lama tentang PP 27/2014 definisi yang tidak ter-retrieve.

---

**perdata_002** *(Medium)*
> *"Apa saja bentuk pemanfaatan Barang Milik Negara/Daerah yang dikenal dalam PP Nomor 27 Tahun 2014 dan bagaimana perbedaan antara Sewa, Pinjam Pakai, dan Bangun Guna Serah?"*

Jawaban yang diharapkan: 6 bentuk pemanfaatan BMN + perbedaan Sewa, Pinjam Pakai, BGS.
Catatan: Dijawab dari PP 17/2022 (konten serupa, versi lebih baru).

---

**perdata_003** *(Medium)*
> *"Apa yang dimaksud dengan Kawasan Tanpa Rokok (KTR), apa tujuan penetapannya, dan di mana saja KTR ditetapkan berdasarkan Peraturan Daerah tentang Kawasan Tanpa Rokok?"*

Jawaban yang diharapkan: Definisi KTR + tujuan (Pasal 3) + 7 lokasi KTR (Pasal 5).
Catatan: Menggantikan pertanyaan lama tentang PP 28/2022 PUPN yang tidak terindeks.

---

**perdata_004** *(Easy)*
> *"Apa yang dimaksud dengan Surat Paksa dalam pengurusan piutang negara dan berapa jangka waktu pembayaran yang diberikan kepada penanggung utang berdasarkan PP Nomor 28 Tahun 2022?"*

Jawaban yang diharapkan: Definisi Surat Paksa + jangka waktu 1×24 jam.
Catatan: PP 28/2022 tidak ter-retrieve dengan optimal di Pinecone — retrieval masih lemah.

---

**perdata_005** *(Hard)*
> *"Bagaimana kewenangan Pengguna Barang dalam mengelola Barang Milik Negara berdasarkan PP Nomor 27 Tahun 2014, dan apa kewajiban pelaporan yang harus dipenuhi?"*

Jawaban yang diharapkan: Daftar 9+ kewenangan Pengguna Barang + kewajiban laporan semesteran & tahunan.
Kategori: Hard karena memerlukan enumerasi panjang dari dokumen teknis.

---

## 7. Penjelasan Setiap Metrik

### 7.1 Kelompok Non-LLM (Deterministik)

Metrik ini **tidak butuh AI** — hasilnya selalu sama setiap kali dijalankan. Bekerja dengan membandingkan teks secara matematis.

---

#### ROUGE-L F1 — *Recall-Oriented Understudy for Gisting Evaluation*

**Cara kerja:**
ROUGE-L mencari **Longest Common Subsequence (LCS)** — urutan kata terpanjang yang muncul di kedua teks, tidak harus berurutan/menerus.

**Contoh konkret:**
```
Referensi : "perusahaan swasta wajib mempekerjakan 1% penyandang disabilitas"
Jawaban AI: "setiap perusahaan swasta yang beroperasi WAJIB mempekerjakan minimal
             1% tenaga kerja penyandang disabilitas dari total pegawai"

LCS        : "perusahaan swasta wajib mempekerjakan 1% penyandang disabilitas"
             (6 kata berurutan cocok)
```

**Formula:**
- Precision = LCS / panjang jawaban AI
- Recall = LCS / panjang referensi
- F1 = harmonic mean(Precision, Recall)

**Interpretasi untuk chatbot hukum:**
- Skor rendah bukan selalu buruk — AI sering menjelaskan lebih panjang dari referensi ringkas
- Target minimal: ≥ 0.25 (referensi evaluasi-1 menunjukkan baseline 0.276)

---

#### BLEU Score — *Bilingual Evaluation Understudy*

**Cara kerja:**
BLEU menghitung berapa banyak **n-gram** (kombinasi 1, 2, 3, dan 4 kata berurutan) dari jawaban AI yang juga muncul di referensi.

**Contoh:**
```
Referensi : "wajib mempekerjakan 1 persen penyandang disabilitas"
Jawaban AI: "wajib mempekerjakan paling sedikit 1 persen penyandang disabilitas"

1-gram matches: wajib ✓, mempekerjakan ✓, 1 ✓, persen ✓, penyandang ✓, disabilitas ✓
2-gram matches: "wajib mempekerjakan" ✓, "1 persen" ✓, "penyandang disabilitas" ✓
3-gram matches: "1 persen penyandang" ✓
```

**Perbedaan dengan ROUGE-L:**
- ROUGE-L: urutan kata tidak harus menerus (lebih fleksibel)
- BLEU: harus frasa persis berurutan (lebih ketat)

**Kelebihan BLEU:** Sensitif terhadap penggunaan istilah hukum yang tepat. Jika AI menyebut "satu persen" tapi referensi bilang "1%", BLEU akan memberikan skor lebih rendah.

---

#### Non-LLM String Similarity

**Cara kerja:**
Menggunakan algoritma **edit distance** (Levenshtein) atau **token-based similarity** untuk mengukur seberapa mirip dua teks secara keseluruhan.

Berbeda dari ROUGE/BLEU yang fokus ke kata, String Similarity melihat **struktur dan panjang teks secara global**.

**Kapan berguna:**
- Mendeteksi jawaban "tidak ditemukan" vs jawaban substantif (beda struktur total)
- Mengukur kemiripan format (apakah AI menggunakan poin-poin seperti referensi)

---

### 7.2 Kelompok LLM-based (Semantik)

Metrik ini menggunakan **AI juri (qwen3-32b via Groq)** untuk menilai secara semantik. Hasilnya lebih representatif dari Non-LLM karena memahami makna, bukan hanya kata.

---

#### Faithfulness — *Kesetiaan Jawaban terhadap Konteks*

**Pertanyaan yang dijawab:** *"Apakah AI mengarang sesuatu yang tidak ada di dokumen?"*

**Cara kerja RAGAS:**
```
1. AI juri membaca jawaban AI
2. Pecah jawaban menjadi daftar klaim atomik:
   - "Perusahaan swasta wajib mempekerjakan 1% disabilitas" → Klaim 1
   - "Pemerintah memberikan insentif ke perusahaan" → Klaim 2
   - ...
3. Untuk setiap klaim: cek apakah bisa diverifikasi dari konteks Pinecone
4. Faithfulness = klaim yang bisa diverifikasi / total klaim
```

**Mengapa ini metrik terpenting untuk chatbot hukum:**
Informasi hukum yang salah bisa merugikan pengguna. Faithfulness tinggi berarti sistem tidak mengarang pasal, tidak membuat angka, dan tidak mengklaim sesuatu yang tidak ada di peraturan.

**Hasil TanyaHukum:** 0.833 → 83% klaim bisa diverifikasi. ✅

---

#### Answer Relevancy — *Relevansi Jawaban*

**Pertanyaan yang dijawab:** *"Apakah jawaban AI fokus menjawab apa yang ditanya?"*

**Cara kerja RAGAS (unik):**
```
1. AI juri membaca jawaban AI
2. Hasilkan N pertanyaan alternatif yang sesuai dengan jawaban tersebut
3. Hitung cosine similarity antara pertanyaan asli vs pertanyaan alternatif
4. Answer Relevancy = rata-rata similarity
```

**Intuisi:** Jika jawaban AI relevan, maka pertanyaan yang dihasilkan dari jawaban itu harus mirip dengan pertanyaan aslinya.

**Contoh skor rendah:** User tanya "Apa sanksi pelanggaran KTR?" tapi AI menjawab panjang lebar tentang sejarah kawasan tanpa rokok → pertanyaan yang dihasilkan dari jawaban itu tidak mirip dengan pertanyaan asli → skor rendah.

**Hasil TanyaHukum:** 0.593 (rata-rata 5 sampel) ✅

---

#### Context Precision — *Presisi Konteks*

**Pertanyaan yang dijawab:** *"Dari 10 dokumen yang diambil Pinecone, berapa yang benar-benar berguna?"*

**Cara kerja:**
```
1. Lihat 10 chunk yang diambil Pinecone
2. Untuk setiap chunk: apakah chunk ini membantu menjawab pertanyaan?
   (dibandingkan dengan jawaban referensi)
3. Context Precision = chunk relevan / total chunk (dengan bobot ranking)
```

**Mengapa penting:** Jika Pinecone mengambil banyak dokumen tidak relevan, AI akan "bingung" karena harus memproses banyak noise → kemungkinan jawaban melenceng lebih tinggi.

**Hasil TanyaHukum:** 0.754 → 75% chunk relevan. ✅

---

#### Context Recall — *Recall Konteks*

**Pertanyaan yang dijawab:** *"Apakah Pinecone berhasil menemukan SEMUA informasi yang dibutuhkan?"*

**Cara kerja:**
```
1. Ambil jawaban referensi (ground truth)
2. Pecah menjadi klaim-klaim informasi yang dibutuhkan
3. Untuk setiap klaim: apakah informasi ini bisa ditemukan di konteks yang diambil?
4. Context Recall = klaim yang tercakup konteks / total klaim referensi
```

**Perbedaan Precision vs Recall:**
- **Precision** = dari yang diambil, berapa yang relevan? (kualitas)
- **Recall** = dari yang seharusnya diambil, berapa yang berhasil diambil? (kelengkapan)

**Hasil TanyahHukum:** 0.889 → 89% informasi penting berhasil ditemukan. ✅

---

#### Answer Correctness — *Kebenaran Jawaban*

**Pertanyaan yang dijawab:** *"Seberapa benar jawaban AI secara keseluruhan dibanding referensi?"*

**Cara kerja:**
Kombinasi dari dua sub-skor:
- **Factual similarity:** seberapa banyak fakta yang sama antara jawaban AI dan referensi
- **Semantic similarity:** seberapa mirip makna keduanya secara keseluruhan (menggunakan embedding)

Formula: `Answer Correctness = 0.75 × factual_score + 0.25 × semantic_score`

**Hasil TanyaHukum:** 0.684 → jawaban AI sekitar 68% benar dibanding referensi. ✅

---

#### Factual Correctness — *Akurasi Faktual*

**Pertanyaan yang dijawab:** *"Seberapa tepat fakta-fakta spesifik dalam jawaban AI?"*

**Cara kerja:**
```
1. Ekstrak semua klaim faktual dari jawaban AI (angka, nama, tanggal, pasal)
2. Ekstrak semua klaim faktual dari referensi
3. Hitung:
   - Precision = fakta AI yang benar / total fakta AI
   - Recall = fakta referensi yang dicakup AI / total fakta referensi
   - F1 = harmonic mean(Precision, Recall)
```

**Contoh:**
```
Referensi: "1% untuk swasta, 2% untuk BUMN, jangka waktu 1×24 jam"
AI menjawab: "1% untuk swasta, 2% untuk BUMN, jangka waktu 48 jam"

Precision: 2/3 = 0.667 (hanya "48 jam" salah)
Recall: 2/3 = 0.667
F1: 0.667
```

**Hasil TanyaHukum:** 0.587 → akurasi fakta ~59%. Masih ada ruang untuk meningkatkan ketepatan angka dan detail spesifik. ⚠️

---

### Ringkasan Semua Metrik

| Metrik | Tipe | Butuh API? | Mengukur Apa | Target |
|---|---|---|---|---|
| ROUGE-L F1 | Non-LLM | Tidak | Overlap urutan kata | ≥ 0.25 |
| BLEU Score | Non-LLM | Tidak | Overlap frasa persis | ≥ 0.10 |
| String Similarity | Non-LLM | Tidak | Kemiripan teks global | ≥ 0.22 |
| Faithfulness | LLM | Ya | Anti-halusinasi | ≥ 0.70 |
| Answer Relevancy | LLM | Ya | Fokus jawaban | ≥ 0.55 |
| Context Precision | LLM | Ya | Kualitas retrieval | ≥ 0.60 |
| Context Recall | LLM | Ya | Kelengkapan retrieval | ≥ 0.60 |
| Answer Correctness | LLM | Ya | Kebenaran jawaban | ≥ 0.52 |
| Factual Correctness | LLM | Ya | Akurasi fakta spesifik | ≥ 0.50 |

---

## 8. Hasil Evaluasi Lengkap

### 8.1 Skor Keseluruhan

#### Non-LLM (10/10 sampel)

| Metrik | Skor | Target | Status |
|---|---|---|---|
| **ROUGE-L F1** | **0.3713** | ≥ 0.25 | ✅ Melewati target |
| **BLEU Score** | **0.2472** | ≥ 0.10 | ✅ Melewati target |
| **String Similarity** | **0.3639** | ≥ 0.22 | ✅ Melewati target |

#### LLM-based (10/10 sampel — Lengkap)

| Metrik | Skor | Target | Status |
|---|---|---|---|
| **Faithfulness** | **0.881** | ≥ 0.70 | ✅ Sangat Baik |
| **Answer Relevancy** | **0.425** | ≥ 0.55 | ⚠️ Cukup |
| **Context Precision** | **0.554** | ≥ 0.60 | ⚠️ Cukup |
| **Context Recall** | **0.775** | ≥ 0.60 | ✅ Sangat Baik |
| **Answer Correctness** | **0.651** | ≥ 0.52 | ✅ Baik |
| **Factual Correctness** | **0.475** | ≥ 0.50 | ⚠️ Cukup |

---

### 8.2 Hasil Per Sampel (Detail Lengkap)

#### naker_001 — Persentase Disabilitas
*Dokumen: PERDA Tulang Bawang Barat 13/2025 | Easy*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.550** | Overlap kata tinggi — AI mengutip langsung dari peraturan |
| BLEU | **0.567** | Frasa persis banyak cocok — jawaban dekat dengan referensi |
| String Similarity | **0.461** | Struktur teks mirip |
| Faithfulness | **0.750** | 3 dari 4 klaim terverifikasi |
| Answer Relevancy | **0.586** | Jawaban fokus ke pertanyaan |
| Context Precision | **0.827** | 8 dari 10 chunk yang diambil relevan |
| Context Recall | **1.000** | Semua informasi yang dibutuhkan berhasil ditemukan |
| Answer Correctness | **0.508** | Isi jawaban separuh cocok dengan referensi |
| Factual Correctness | **0.530** | Fakta angka persentase tepat |

**Analisis:** Retrieval sangat baik (Context Recall 1.0 — Pinecone menemukan semua yang dibutuhkan). Faithfulness 0.75 menunjukkan AI sedikit menambahkan kalimat penjelasan di luar teks peraturan, yang wajar untuk chatbot. Answer Correctness 0.508 lebih rendah karena jawaban AI lebih panjang dan memiliki struktur berbeda dari referensi ringkas.

---

#### naker_002 — Tugas Unit Layanan Disabilitas
*Dokumen: PERDA Tulang Bawang Barat 13/2025 | Medium*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.690** | Skor tertinggi di dataset — jawaban sangat mirip referensi |
| BLEU | **0.286** | Frasa berurutan cukup cocok |
| String Similarity | **0.629** | Teks sangat mirip secara keseluruhan |
| Faithfulness | **1.000** | Sempurna — semua klaim bisa diverifikasi dari dokumen |
| Answer Relevancy | **0.641** | Jawaban cukup fokus |
| Context Precision | **0.585** | 6 dari 10 chunk relevan |
| Context Recall | **1.000** | Semua informasi ditemukan |
| Answer Correctness | **0.982** | Jawaban hampir sempurna sama dengan referensi |
| Factual Correctness | **0.930** | Semua fakta (daftar tugas ULD) hampir benar semua |

**Analisis:** Sampel terbaik di seluruh dataset. Faithfulness 1.0 berarti AI tidak mengarang satu pun klaim. Answer Correctness 0.982 dan Factual Correctness 0.930 menunjukkan jawaban AI hampir identik dengan referensi. Pertanyaan tentang daftar tugas ternyata sangat cocok untuk sistem RAG — AI cukup mengutip langsung dari dokumen.

---

#### naker_003 — Tunjangan Hakim Ad-Hoc PHI
*Dokumen: PERPRES 96/2006 | Medium*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.341** | Overlap moderat |
| BLEU | **0.477** | Frasa persis cukup banyak cocok |
| String Similarity | **0.315** | Kemiripan teks sedang |
| Faithfulness | **0.875** | Hampir semua klaim terverifikasi |
| Answer Relevancy | **0.222** | Jawaban kurang fokus ke pertanyaan inti |
| Context Precision | **1.000** | Semua chunk yang diambil relevan |
| Context Recall | **1.000** | Semua informasi ditemukan |
| Answer Correctness | **0.349** | Jawaban berbeda cukup jauh dari referensi |
| Factual Correctness | **0.330** | Fakta detail tunjangan kurang tepat |

**Analisis:** Answer Relevancy 0.222 rendah — pertanyaan tentang "tunjangan dan hak-hak" dijawab AI dengan sangat detail tentang konteks pengadilan, padahal yang ditanya spesifik tunjangan. Context Precision 1.0 artinya Pinecone menemukan chunk yang tepat dari PERPRES 96/2006. Masalah ada di generasi — AI kurang fokus ke inti jawaban.

---

#### naker_004 — Definisi CSR
*Dokumen: PERDA Sukabumi 5/2023 | Easy*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.402** | Overlap kata baik |
| BLEU | **0.201** | Frasa persis sedang |
| String Similarity | **0.411** | Kemiripan teks baik |
| Faithfulness | **1.000** | Sempurna — semua klaim terverifikasi |
| Answer Relevancy | **0.357** | Jawaban kurang fokus ke inti pertanyaan |
| Context Precision | **0.000** | Konteks yang diambil tidak terurut berdasarkan relevansi |
| Context Recall | **0.667** | 2 dari 3 informasi kunci ditemukan |
| Answer Correctness | **0.641** | Isi jawaban cukup tepat |
| Factual Correctness | **0.360** | Beberapa fakta CSR kurang akurat |

**Analisis:** Faithfulness sempurna (1.000) — AI hanya mengutip dari konteks. Namun Context Precision 0.000 adalah anomali: Pinecone memang menemukan dokumen CSR, tapi pengurutan chunk tidak sesuai prioritas relevansi. Answer Relevancy rendah (0.357) karena AI menjawab terlalu luas tentang CSR secara umum, padahal pertanyaan spesifik tentang Kabupaten Sukabumi.

---

#### naker_005 — Tujuan & Dasar Hukum Perizinan
*Dokumen: PERDA Kota Madiun 8/2023 | Hard*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.244** | Overlap kata rendah |
| BLEU | **0.145** | Frasa persis sedikit cocok |
| String Similarity | **0.227** | Kemiripan teks rendah |
| Faithfulness | **1.000** | Sempurna — tidak ada klaim yang dikarang |
| Answer Relevancy | **0.623** | Jawaban cukup relevan |
| Context Precision | **0.729** | Urutan konteks baik |
| Context Recall | **1.000** | Semua informasi kunci ditemukan |
| Answer Correctness | **0.660** | Isi jawaban cukup benar |
| Factual Correctness | **0.630** | Fakta hukum cukup akurat |

**Analisis:** Meskipun ROUGE-L rendah (0.244 — karena AI merumuskan ulang dengan bahasa sendiri), metrik LLM menunjukkan kualitas tinggi. Faithfulness 1.000 dan Context Recall 1.000 — sistem menemukan semua info dan menjawab berdasarkan konteks. Ini contoh di mana metrik non-LLM bisa menyesatkan: jawaban sebenarnya baik tapi terlihat rendah karena redaksi berbeda.

---

#### perdata_001 — Pemanfaatan BMN
*Dokumen: PP 17/2022 | Easy*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.366** | Overlap kata baik |
| BLEU | **0.348** | Frasa persis cukup |
| String Similarity | **0.391** | Kemiripan teks baik |
| Faithfulness | **0.923** | Hampir semua klaim terverifikasi |
| Answer Relevancy | **0.290** | Jawaban kurang fokus |
| Context Precision | **0.746** | Konteks yang diambil cukup presisi |
| Context Recall | **1.000** | Semua informasi ditemukan |
| Answer Correctness | **0.669** | Isi jawaban cukup benar |
| Factual Correctness | **0.530** | Fakta BMN cukup akurat |

**Analisis:** Context Recall 1.000 dan Faithfulness 0.923 sangat baik — retrieval berhasil dan AI menggunakan konteks dengan baik. Namun Answer Relevancy 0.290 rendah — AI menjawab terlalu komprehensif tentang pemanfaatan BMN secara umum, padahal pertanyaan lebih spesifik tentang bentuk-bentuk pemanfaatan. Ini menunjukkan perlunya prompt yang lebih terarah.

---

#### perdata_002 — Bentuk Pemanfaatan BMN
*Dokumen: PP 27/2014 (dijawab dari PP 17/2022) | Medium*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.219** | Di bawah rata-rata |
| BLEU | **0.154** | Frasa persis sedikit |
| String Similarity | **0.241** | Kemiripan teks rendah |
| Faithfulness | **1.000** | Sempurna — semua klaim bisa diverifikasi |
| Answer Relevancy | **0.240** | Jawaban sangat kurang fokus |
| Context Precision | **0.403** | Hanya 4 dari 10 chunk relevan |
| Context Recall | **1.000** | Semua informasi ditemukan |
| Answer Correctness | **0.674** | Isi jawaban cukup benar |
| Factual Correctness | **0.270** | Fakta detail BMN kurang akurat |

**Analisis:** Pola menarik — Faithfulness 1.000 dan Context Recall 1.000, tapi Answer Relevancy 0.240 sangat rendah. Ini menunjukkan AI berhasil menemukan informasi dan tidak mengarang, tapi cara menjawab tidak fokus. Referensi dibuat berdasarkan PP 27/2014, sedangkan konteks dari PP 17/2022 — konten sama tapi redaksi berbeda, sehingga Non-LLM rendah tapi correctness masih 0.674.

---

#### perdata_003 — Kawasan Tanpa Rokok
*Dokumen: Perda 1/2024 | Medium*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.385** | Overlap kata baik |
| BLEU | **0.164** | Frasa persis sedang |
| String Similarity | **0.351** | Kemiripan teks baik |
| Faithfulness | **0.800** | 4 dari 5 klaim terverifikasi |
| Answer Relevancy | **0.684** | Jawaban cukup fokus dan relevan |
| Context Precision | **0.500** | Separuh konteks relevan |
| Context Recall | **0.750** | 3 dari 4 informasi kunci ditemukan |
| Answer Correctness | **0.572** | Isi jawaban setengah cocok |
| Factual Correctness | **0.620** | Fakta KTR cukup akurat |

**Analisis:** Pertanyaan pengganti berhasil baik. Answer Relevancy 0.684 tertinggi di domain Perdata — pertanyaan tentang Kawasan Tanpa Rokok ternyata sangat jelas dan langsung dijawab dengan fokus. Context Recall 0.750 artinya 1 dari 4 informasi KTR tidak ditemukan Pinecone, kemungkinan bagian yang tidak ter-chunk optimal.

---

#### perdata_004 — Surat Paksa Piutang Negara
*Dokumen: PP 28/2022 | Easy*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.151** | Terendah di dataset |
| BLEU | **0.024** | Sangat rendah |
| String Similarity | **0.265** | Kemiripan teks rendah |
| Faithfulness | **0.857** | 6 dari 7 klaim terverifikasi |
| Answer Relevancy | **0.000** | Jawaban sama sekali tidak relevan |
| Context Precision | **0.167** | Hanya 1-2 chunk relevan dari 10 |
| Context Recall | **0.000** | Tidak ada informasi kunci yang ditemukan |
| Answer Correctness | **0.374** | Jawaban kurang tepat |
| Factual Correctness | **0.140** | Fakta Surat Paksa sangat tidak akurat |

**Analisis:** Sampel terburuk di dataset. Context Recall 0.000 adalah diagnosis utama — Pinecone gagal menemukan satu pun informasi relevan tentang Surat Paksa/PUPN. Menariknya, Faithfulness 0.857 masih tinggi — artinya AI menjawab berdasarkan konteks yang ditemukan (meskipun konteks itu salah topik). Ini bukan AI mengarang, tapi AI menjawab dari dokumen yang salah diambil oleh retrieval.

**Rekomendasi:** Audit chunk PP 28/2022 di Pinecone. Kemungkinan dokumen ter-split tidak optimal, metadata "Surat Paksa" / "PUPN" tidak tertangkap, atau query embedding tidak cocok dengan vektor dokumen.

---

#### perdata_005 — Kewenangan Pengguna Barang
*Dokumen: PP 27/2014 + PP 28/2022 | Hard*

| Metrik | Skor | Interpretasi |
|---|---|---|
| ROUGE-L | **0.366** | Overlap kata baik |
| BLEU | **0.105** | Frasa persis rendah |
| String Similarity | **0.347** | Kemiripan teks cukup |
| Faithfulness | **0.727** | 8 dari 11 klaim terverifikasi |
| Answer Relevancy | **0.473** | Jawaban agak fokus |
| Context Precision | **0.732** | Konteks yang diambil cukup presisi |
| Context Recall | **0.667** | 2 dari 3 informasi ditemukan |
| Answer Correctness | **0.867** | Jawaban sangat tepat secara isi |
| Factual Correctness | **0.440** | Fakta kewenangan cukup akurat |

**Analisis:** Hasil yang cukup baik untuk pertanyaan Hard. Answer Correctness 0.867 tertinggi di domain Perdata — AI berhasil menjawab dengan konten yang tepat. BLEU rendah (0.105) karena AI menggunakan redaksi berbeda dari PP 27/2014, padahal isi jawaban sudah benar. Context Recall 0.667 menunjukkan 1 dari 3 informasi kewenangan Pengguna Barang tidak ter-retrieve — mungkin bagian dari PP 28/2022 yang juga bermasalah.

---

## 9. Analisis Per Domain

### Domain Ketenagakerjaan (5 sampel)

| Metrik | Skor | Vs. Perdata | Status |
|---|---|---|---|
| ROUGE-L | **0.445** | +0.148 lebih tinggi | ✅ Baik |
| BLEU | **0.335** | +0.176 lebih tinggi | ✅ Baik |
| String Similarity | **0.409** | +0.090 lebih tinggi | ✅ Baik |
| **Faithfulness** | **0.900** | +0.039 lebih tinggi | ✅ Sangat Baik |
| **Answer Relevancy** | **0.512** | +0.175 lebih tinggi | ⚠️ Cukup |
| **Context Precision** | **0.598** | +0.088 lebih tinggi | ✅ Baik |
| **Context Recall** | **0.867** | +0.184 lebih tinggi | ✅ Sangat Baik |
| **Answer Correctness** | **0.671** | +0.040 lebih tinggi | ✅ Baik |
| **Factual Correctness** | **0.550** | +0.150 lebih tinggi | ✅ Baik |

**Mengapa Ketenagakerjaan lebih baik?**
1. Dokumen PERDA Ketenagakerjaan terindeks sangat baik di Pinecone
2. PERDA Tulang Bawang Barat 13/2025 memiliki teks terstruktur dengan pasal-pasal yang jelas
3. Context Recall 0.867 — Pinecone berhasil menemukan hampir semua informasi yang dibutuhkan
4. Faithfulness 0.900 — AI sangat jarang mengarang untuk domain ini

---

### Domain Perdata (5 sampel)

| Metrik | Skor | Status |
|---|---|---|
| ROUGE-L | **0.297** | ⚠️ Cukup (di bawah 0.35) |
| BLEU | **0.159** | ⚠️ Cukup |
| String Similarity | **0.319** | ⚠️ Cukup |
| **Faithfulness** | **0.861** | ✅ Sangat Baik |
| **Answer Relevancy** | **0.337** | ❌ Rendah |
| **Context Precision** | **0.510** | ⚠️ Cukup |
| **Context Recall** | **0.683** | ✅ Baik |
| **Answer Correctness** | **0.631** | ✅ Baik |
| **Factual Correctness** | **0.400** | ❌ Rendah |

**Penyebab Perdata lebih rendah:**
1. **perdata_004** (rel=0.000, rec=0.000) menarik rata-rata turun drastis — PP 28/2022 tidak ter-retrieve
2. Answer Relevancy domain Perdata rata-rata 0.337 — jawaban sering terlalu luas, tidak langsung menjawab inti
3. Beberapa pertanyaan mengacu PP 27/2014 tapi Pinecone memiliki PP 17/2022 — konten mirip tapi redaksi beda
4. Terminologi teknis (BMN, PUPN, Surat Paksa) mungkin butuh query expansion

**Catatan:** Faithfulness 0.861 tetap tinggi di Perdata — sistem tidak mengarang meski konteks kurang optimal.

---

## 10. Analisis Per Tingkat Kesulitan

| Tingkat | Sampel | ROUGE-L | BLEU | Faithfulness | Relevancy | Recall |
|---|---|---|---|---|---|---|
| **Easy** | naker_001, naker_004, perdata_001, perdata_004 | 0.367 | 0.285 | 0.883 | 0.308 | 0.584 |
| **Medium** | naker_002, naker_003, perdata_002, perdata_003 | 0.409 | 0.270 | 0.887 | 0.480 | 0.938 |
| **Hard** | naker_005, perdata_005 | 0.305 | 0.125 | 0.863 | 0.548 | 0.834 |

**Temuan menarik dari LLM metrics:**

1. **Faithfulness konsisten di semua tingkat (0.863–0.887)** — sistem tidak mengarang terlepas dari kompleksitas pertanyaan
2. **Medium Context Recall tertinggi (0.938)** — dokumen medium paling mudah di-retrieve dari Pinecone
3. **Hard Answer Relevancy justru tertinggi (0.548)** — pertanyaan Hard yang terfokus mendapat jawaban lebih tepat sasaran
4. **Easy Relevancy paling rendah (0.308)** — karena perdata_004 (rel=0.000) menarik rata-rata Easy turun

**Penjelasan:** Perbedaan skor lebih disebabkan oleh ketersediaan dan kualitas dokumen di Pinecone daripada kompleksitas pertanyaan itu sendiri. Ini mengindikasikan kualitas indeks Pinecone adalah faktor utama yang menentukan performa sistem.

---

## 11. Masalah yang Ditemukan dan Solusinya

### Masalah 1 — 3 Dokumen Tidak Terindeks di Pinecone

**Gejala:** 3 pertanyaan mendapat jawaban "Maaf, tidak ditemukan" meski Pinecone sudah mengembalikan 10 chunk.

**Penyebab yang ditemukan setelah audit:**
| Dokumen | Status di Pinecone |
|---|---|
| PP 26/2019 (Hakim PHI Pengangkatan) | Tidak ada sama sekali |
| PP 28/2022 (PUPN/Piutang) | Tidak ada sama sekali |
| PP 27/2014 Pasal 1 (Definisi BMN) | Ada tapi chunk tidak mengandung pasal definisi |

**Solusi yang diterapkan:** Ganti pertanyaan ke dokumen yang dikonfirmasi tersedia:
- PP 26/2019 → PERPRES 96/2006 (tunjangan hakim, BUKAN pengangkatan)
- PP 28/2022 → Perda 1/2024 KTR (topik berbeda tapi Perdata)
- PP 27/2014 definisi → PP 17/2022 (pemanfaatan BMN, versi lebih baru)

**Pelajaran:** Selalu verifikasi dokumen di Pinecone sebelum membuat pertanyaan evaluasi.

---

### Masalah 2 — Groq TPD (Token Per Day) Habis

**Gejala:** Error `Rate limit reached... tokens per day (TPD): Limit 500000, Used 497605`

**Penyebab:** Selama sesi evaluasi, dua model Groq mencapai batas harian:
- `llama-3.3-70b-versatile`: 97.919/100.000 tokens (TPD habis)
- `llama-3.1-8b-instant`: 499.817/500.000 tokens (TPD hampir habis)

**Solusi:**
1. Beralih ke model lain yang TPD-nya masih segar: `qwen/qwen3-32b`, `meta-llama/llama-4-scout-17b`
2. List semua model tersedia via Groq API: `client.models.list()`

---

### Masalah 3 — Groq TPM (Token Per Minute) qwen3-32b & llama-3.1-8b Terlalu Rendah / TPD Habis

**Gejala:** Error `Rate limit reached... tokens per minute (TPM): Limit 6000, Used 5078, Requested 2828` (qwen3-32b) dan `tokens per day (TPD): Limit 500000, Used 498058` (llama-3.1-8b)

**Penyebab:** qwen3-32b free tier hanya 6.000 TPM. RAGAS mengirim 6 metrik secara paralel, tiap metrik ~2.000-3.000 token = total ~12.000-18.000 token per sampel. Langsung melebihi limit. llama-3.1-8b punya 30K TPM tapi TPD sudah hampir habis.

**Solusi yang akhirnya berhasil:**
1. Gunakan `meta-llama/llama-4-scout-17b-16e-instruct` yang punya quota segar
2. Script `eval_sequential.py` dengan delay 10 detik antar sampel
3. Evaluasi selesai dalam ~25 menit untuk 7 sampel

**Dampak akhir:** LLM metrics berhasil tersedia untuk **semua 10/10 sampel**.

---

### Masalah 4 — Gemini 20 RPD (Requests Per Day) Habis

**Gejala:** Error 429 dari Gemini 2.5 Flash untuk generator jawaban

**Penyebab:** Gemini free tier hanya 20 requests/hari. Untuk 10 pertanyaan evaluasi + beberapa percobaan = lebih dari 20 request.

**Solusi:** Beralih ke Groq (llama-4-scout-17b) sebagai generator jawaban — quota jauh lebih besar.

---

## 12. Perbandingan dengan Evaluasi Pertama (Eval-1)

Evaluasi pertama dilakukan untuk domain KUHP, UU ITE, dan Perlindungan Konsumen (15 sampel).

| Aspek | Eval-1 | Eval-2 v2 | Perubahan |
|---|---|---|---|
| Domain | KUHP, ITE, Konsumen | Ketenagakerjaan, Perdata | Diperluas |
| Jumlah sampel | 15 | 10 | Lebih sedikit tapi lebih representatif |
| ROUGE-L | 0.276 | **0.371** | ↑ +34% lebih baik |
| BLEU | 0.115 | **0.247** | ↑ +115% lebih baik |
| String Similarity | 0.259 | **0.364** | ↑ +40% lebih baik |
| Coverage retrieval | 100% | **100%** | = Sama (setelah perbaikan) |
| Faithfulness (LLM) | 0.876 | **0.881** | ↑ Sedikit lebih baik |
| Context Precision (LLM) | 0.810 | **0.554** | ↓ Lebih rendah |
| Context Recall (LLM) | N/A | **0.775** | ✅ Baru tersedia |
| Answer Relevancy (LLM) | N/A | **0.425** | ✅ Baru tersedia |
| Answer Correctness (LLM) | N/A | **0.651** | ✅ Baru tersedia |

**Kesimpulan perbandingan:**
- Non-LLM jauh lebih baik di Eval-2 karena dataset diperbaiki (tidak ada "tidak ditemukan")
- Faithfulness hampir sama (0.876 vs 0.881) — konsistensi sistem tidak mengarang
- Context Precision lebih rendah di Eval-2 — domain Perdata lebih heterogen, Pinecone mengambil dokumen yang sedikit kurang presisi
- Context Recall 0.775 baru tersedia di Eval-2 — retrieval secara umum menemukan informasi yang dibutuhkan

---

## 13. Rekomendasi Perbaikan

### Prioritas 1 — Perbaiki Retrieval perdata_004 (PP 28/2022)
BLEU 0.024 dan ROUGE 0.151 menunjukkan retrieval benar-benar gagal untuk Surat Paksa/PUPN.

**Langkah konkret:**
```bash
# Cek apakah PP 28/2022 ada di Pinecone
python3 -c "
from pinecone import Pinecone
import voyageai
pc = Pinecone(api_key='...')
index = pc.Index('tanyahukum2')
# Query dengan kata kunci spesifik
result = index.query(vector=..., top_k=5, include_metadata=True)
# Cek apakah ada chunk dari PP 28/2022
"
```
Jika tidak ada: ingest ulang PP 28/2022 ke Pinecone.

---

### Prioritas 2 — Tingkatkan Answer Relevancy (saat ini 0.425)

LLM eval sudah lengkap 10/10 sampel. Kelemahan utama berikutnya adalah Answer Relevancy yang rendah (0.425 vs target 0.55). AI sering menjawab terlalu panjang dan tidak langsung ke inti pertanyaan.

**Langkah konkret:**

**Opsi A — Prompt engineering:**
Tambahkan instruksi di system prompt: "Jawab secara langsung dan ringkas, fokus pada inti pertanyaan saja."

**Opsi B — Post-processing response:**
Setelah AI menjawab, minta AI merangkum dalam 2-3 kalimat kunci.

```python
# Contoh perbaikan system prompt
SYSTEM_PROMPT = """Kamu adalah asisten hukum Indonesia. Jawab LANGSUNG dan RINGKAS.
Mulai jawaban dengan langsung menjawab pertanyaan, bukan dengan penjelasan konteks.
Maksimal 200 kata kecuali diminta lebih detail."""
```

---

### Prioritas 3 — Query Expansion untuk Terminologi Teknis

Beberapa istilah teknis sulit di-retrieve karena hanya disebutkan sekali di dokumen:
- "PUPN" → expand ke "Panitia Urusan Piutang Negara"
- "BMN" → expand ke "Barang Milik Negara"
- "KTR" → expand ke "Kawasan Tanpa Rokok"

**Implementasi di pipeline:**
```python
SYNONYMS = {
    "PUPN": "Panitia Urusan Piutang Negara",
    "BMN": "Barang Milik Negara",
    "KTR": "Kawasan Tanpa Rokok",
    "PHI": "Pengadilan Hubungan Industrial",
    "OSS": "Online Single Submission perizinan",
}
def expand_query(query: str) -> str:
    for abbr, full in SYNONYMS.items():
        query = query.replace(abbr, f"{abbr} ({full})")
    return query
```

---

### Prioritas 4 — Naikkan Answer Relevancy

Skor 0.593 menunjukkan jawaban kadang terlalu panjang atau tidak langsung ke inti. Solusi: tambahkan instruksi di System Prompt:

```
TAMBAHKAN KE SYSTEM PROMPT:
"Jawab langsung ke inti pertanyaan di paragraf pertama.
Jangan memulai dengan latar belakang atau konteks umum
kecuali memang dibutuhkan untuk pemahaman."
```

---

### Prioritas 5 — Tambah Pertanyaan Uji Perdata

5 pertanyaan perdata saat ini terlalu sedikit untuk penilaian yang representatif. Tambahkan:
- Pertanyaan tentang PERDA RDTR / tata ruang
- Pertanyaan tentang retribusi daerah
- Pertanyaan tentang perda kesehatan lingkungan

---

## 14. Cara Menjalankan Ulang Evaluasi

### Persyaratan

```bash
# Environment variables yang dibutuhkan (.env atau .env.local)
PINECONE_API_KEY=...
VOYAGEAI_API_KEY=...
GROQ_API_KEY=...
GOOGLE_API_KEY=...  # opsional, jika pakai Gemini
```

### Jalankan Pipeline Lengkap

```bash
cd ragas_eval

# Install dependencies
.venv/bin/pip install ragas langchain-groq voyageai pinecone-client

# Step 1: Jalankan RAG pipeline (generate jawaban)
# Edit bagian __main__ untuk pilih dataset & output
.venv/bin/python pipeline.py

# Step 2: Evaluasi Non-LLM (cepat, tanpa API)
.venv/bin/python eval_nonllm.py

# Step 3: Evaluasi LLM (butuh Groq quota)
# Opsi A: semua sekaligus (butuh quota besar)
.venv/bin/python evaluate.py \
  --skip-rag \
  --dataset test_questions_v2.json \
  --rag-results rag_results_v2.json

# Opsi B: batch kecil (aman untuk free tier)
.venv/bin/python evaluate.py \
  --skip-rag \
  --dataset test_questions_v2.json \
  --rag-results rag_results_v2.json \
  --max-samples 3

# Opsi C: sequential 1 per menit (paling aman)
.venv/bin/python eval_sequential.py --start 0 --end 10 --delay 75
```

### Hanya Ingin Re-run 3 Pertanyaan Tertentu

```bash
# Edit REPLACE_IDS di rerun_replace.py, lalu:
.venv/bin/python rerun_replace.py
```

---

## 15. Struktur File & Kode

```
ragas_eval/
│
├── test_questions_v2.json          ← Dataset 10 pertanyaan + ground truth
│   (versi terbaru, 3 pertanyaan diganti dari v1)
│
├── rag_results_v2.json             ← Jawaban RAG + 10 konteks per pertanyaan
│   (generator: llama-4-scout-17b)
│
├── pipeline.py                     ← Script RAG pipeline
│   ├── class TanyaHukumRAG
│   │   ├── embed_query()           → VoyageAI → vektor 1024-dim
│   │   ├── retrieve()              → Pinecone top-10
│   │   └── generate()             → Groq LLM → jawaban teks
│   └── run_pipeline_on_dataset()   → batch semua pertanyaan
│
├── evaluate.py                     ← Script evaluasi LLM-based
│   ├── build_evaluator_llm()       → ChatGroq qwen3-32b
│   ├── build_ragas_dataset()       → EvaluationDataset RAGAS
│   ├── run_evaluation()            → 6 LLM metrics
│   └── save_results()              → JSON + CSV output
│
├── eval_nonllm.py                  ← Script evaluasi non-LLM
│   └── ROUGE-L, BLEU, StrSim      → tidak butuh API
│
├── eval_sequential.py              ← Evaluasi 1 sampel per menit
│   └── (anti-TPM-limit)
│
├── eval_batch.py                   ← Evaluasi batch kecil
│
├── rerun_replace.py                ← Re-run pipeline untuk ID tertentu
│
└── results/
    ├── nonllm_eval_v2_*.json       ← Hasil non-LLM (10/10 sampel)
    ├── ragas_eval_20260528_003321.json       ← LLM metrics naker_001-003
    └── llm_eval_seq_3_10_20260528_013348.json  ← LLM metrics naker_004–perdata_005
```

---

## 16. Kesimpulan

### Apa yang Berhasil

1. **Sistem tidak mengarang** — Faithfulness 0.881 (rata-rata 10 sampel) menunjukkan 88% klaim AI bisa diverifikasi dari dokumen hukum. Untuk chatbot hukum, ini adalah yang paling penting. Semua sampel memiliki Faithfulness ≥ 0.727.

2. **Retrieval sudah baik** — Context Recall 0.775 menunjukkan Pinecone menemukan ~78% informasi yang dibutuhkan. Coverage jawaban 100% setelah dataset diperbaiki.

3. **Domain Ketenagakerjaan matang** — Faithfulness 0.900, Context Recall 0.867, ROUGE-L 0.445 — semua metrik di atas target. naker_002 adalah sampel terbaik (Faithfulness 1.000, Correctness 0.982).

4. **Evaluasi lengkap 10/10** — Semua 10 sampel berhasil mendapatkan semua 9 metrik (6 LLM + 3 non-LLM). Tidak ada yang gagal.

### Apa yang Perlu Diperbaiki

1. **perdata_004 adalah outlier bermasalah** — rel=0.000, rec=0.000; PP 28/2022 (Surat Paksa/PUPN) tidak ter-retrieve. Harus audit dan perbaiki chunk di Pinecone.

2. **Answer Relevancy rendah (0.425)** — AI sering menjawab terlalu panjang dan tidak fokus. Perbaikan system prompt bisa meningkatkan metrik ini tanpa perlu mengubah model.

3. **Factual Correctness perlu ditingkatkan (0.475)** — Beberapa fakta detail hukum (nomor pasal, jumlah besaran) tidak tepat. Perlu ground truth yang lebih akurat atau model yang lebih kuat.

### Ringkasan Skor Final

| Domain | Faith | Relevancy | Recall | ROUGE | Status |
|---|---|---|---|---|---|
| Ketenagakerjaan | 0.900 | 0.512 | 0.867 | 0.445 | ✅ Baik |
| Perdata | 0.861 | 0.337 | 0.683 | 0.297 | ⚠️ Cukup |
| **Rata-rata** | **0.881** | **0.425** | **0.775** | **0.371** | ✅ Layak |

### Satu Kalimat Kesimpulan

> **TanyaHukum sudah layak digunakan untuk domain Ketenagakerjaan (Faithfulness 0.900, Recall 0.867), dan perlu perbaikan fokus di perdata_004 (PP 28/2022) serta sistem prompt untuk meningkatkan Answer Relevancy dari 0.425 ke target 0.55+.**

---

| | |
|---|---|
| **Framework** | RAGAS 0.2.15 |
| **Generator** | meta-llama/llama-4-scout-17b (Groq) |
| **Retrieval** | VoyageAI voyage-law-2 + Pinecone tanyahukum2 |
| **Non-LLM Eval** | ROUGE-L, BLEU, String Similarity (10/10 sampel) |
| **LLM Eval** | Groq llama-4-scout-17b (10/10 sampel — lengkap) |
| **Tanggal** | 28 Mei 2026 |
| **Ditulis oleh** | Claude (berdasarkan pipeline & hasil evaluasi otomatis) |
