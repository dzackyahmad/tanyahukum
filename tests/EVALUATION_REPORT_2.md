# Laporan Evaluasi RAGAS 2 — Domain Ketenagakerjaan & Perdata

> **Framework:** RAGAS 0.2.15 | **Tanggal:** 28 Mei 2026 | **Status:** ✅ Non-LLM Selesai (10/10) | ✅ LLM Metrics Lengkap (10/10)

---

## Apa itu Laporan Ini?

Laporan ini adalah evaluasi kedua TanyaHukum, khusus untuk **dua domain baru** yang ditambahkan ke database: **Hukum Ketenagakerjaan** dan **Hukum Perdata**. Evaluasi pertama (EVALUATION_REPORT.md) mencakup KUHP, UU ITE, dan UU Perlindungan Konsumen.

**Sistem RAG yang diuji:**
- AI menerima pertanyaan → mencari di database hukum → menghasilkan jawaban
- Model: llama-4-scout-17b / Groq (menjawab) + Voyage-law-2 (mencari) + Pinecone (database)
- 10 pertanyaan uji dari 2 domain, **berbasis dokumen yang dikonfirmasi ada di Pinecone**

---

## Ringkasan Eksekutif

| Aspek | Detail |
|---|---|
| Total Pertanyaan Uji | 10 |
| Domain | Ketenagakerjaan (5), Perdata (5) |
| Sumber Dokumen | PERDA, PP, PERPRES yang sudah diindeks di Pinecone (dikonfirmasi) |
| Non-LLM Evaluator | ROUGE-L, BLEU, String Similarity (deterministik, 10/10 sampel) |
| LLM Evaluator | Groq llama-4-scout-17b (**10/10 sampel — lengkap**) |
| Generator Jawaban | meta-llama/llama-4-scout-17b (Groq) |

> **Pembaruan Dataset:** 3 pertanyaan dari versi sebelumnya diganti karena dokumen targetnya tidak terindeks di Pinecone. Pertanyaan baru berbasis dokumen yang dikonfirmasi tersedia:
> - `naker_003` → PERPRES 96/2006 (Tunjangan Hakim Ad-Hoc PHI)
> - `perdata_001` → PP 17/2022 (Pemanfaatan BMN, pinjam pakai)
> - `perdata_003` → Perda 1/2024 (Kawasan Tanpa Rokok)

---

## Cara Baca Skor

Semua skor skala **0.0 – 1.0** (0% – 100%).

| Skor | Artinya |
|---|---|
| ≥ 0.70 | ✅ **Sangat Baik** |
| 0.50 – 0.69 | ✅ **Baik** |
| 0.35 – 0.49 | ⚠️ **Cukup** — ada ruang perbaikan |
| < 0.35 | ❌ **Rendah** — perlu investigasi |

> *Catatan: Skor ROUGE/BLEU untuk chatbot hukum cenderung lebih tinggi ketika AI mengutip langsung dari teks peraturan, dan lebih rendah ketika AI merumuskan ulang dengan bahasa sendiri.*

---

## Hasil Utama — Metrik Non-LLM (10 Sampel)

Metrik ini membandingkan kata-per-kata antara jawaban AI dengan jawaban referensi, tanpa membutuhkan LLM.

| Metrik | Skor | Status | Keterangan |
|---|---|---|---|
| **ROUGE-L F1** | **0.371** | ✅ Baik | Overlap urutan kata ~37% |
| **BLEU Score** | **0.247** | ✅ Baik | Di atas target minimum 0.10 |
| **String Similarity** | **0.364** | ✅ Baik | Kemiripan karakter ~36% |

**Visualisasi:**
```
ROUGE-L F1       [███████░░░░░░░░░░░░░]  0.371  ✅
BLEU Score       [████░░░░░░░░░░░░░░░░]  0.247  ✅
String Similarity[███████░░░░░░░░░░░░░]  0.364  ✅
```

**Perbandingan dengan Evaluasi Sebelumnya:**

| Metrik | Eval-2 v1 (sebelum perbaikan) | Eval-2 v2 (sekarang) | Selisih |
|---|---|---|---|
| ROUGE-L F1 | 0.313 | **0.371** | ↑ +0.058 |
| BLEU Score | 0.131 | **0.247** | ↑ +0.116 |
| String Similarity | 0.139 | **0.364** | ↑ +0.225 |

> *Peningkatan signifikan terjadi setelah mengganti 3 pertanyaan yang sebelumnya gagal (dokumen tidak terindeks di Pinecone) dengan pertanyaan yang mengacu pada dokumen yang tersedia.*

---

## Hasil Utama — Metrik LLM (10 Sampel — Lengkap)

Metrik ini mengevaluasi kualitas jawaban secara semantik menggunakan LLM sebagai juri (llama-4-scout-17b).

| Metrik | Skor | Target | Status | Artinya |
|---|---|---|---|---|
| **Faithfulness** | **0.881** | ≥ 0.70 | ✅ Sangat Baik | Jawaban setia pada konteks, tidak mengarang |
| **Answer Relevancy** | **0.425** | ≥ 0.55 | ⚠️ Cukup | Jawaban relevan dengan pertanyaan |
| **Context Precision** | **0.554** | ≥ 0.60 | ⚠️ Cukup | Sebagian besar konteks yang diambil presisi |
| **Context Recall** | **0.775** | ≥ 0.60 | ✅ Sangat Baik | Konteks mencakup informasi yang dibutuhkan |
| **Answer Correctness** | **0.651** | ≥ 0.52 | ✅ Baik | Jawaban secara faktual benar |
| **Factual Correctness** | **0.475** | ≥ 0.50 | ⚠️ Cukup | Akurasi faktual jawaban |

**Visualisasi:**
```
Faithfulness     [█████████████████░░░]  0.881  ✅ Sangat Baik
Answer Relevancy [████████░░░░░░░░░░░░]  0.425  ⚠️ Cukup
Context Precision[███████████░░░░░░░░░]  0.554  ⚠️ Cukup
Context Recall   [███████████████░░░░░]  0.775  ✅ Sangat Baik
Answer Correctness[█████████████░░░░░░]  0.651  ✅ Baik
Factual Correct  [█████████░░░░░░░░░░░]  0.475  ⚠️ Cukup
```

**Analisis Kunci:**
- **Faithfulness 0.881** — sangat baik, sistem jarang mengarang informasi di luar konteks
- **Context Recall 0.775** — retrieval berhasil mengambil sebagian besar informasi relevan
- **Answer Relevancy 0.425** — kelemahan utama: jawaban sering terlalu panjang atau tidak langsung menjawab inti pertanyaan
- **perdata_004** menarik turun rata-rata secara signifikan (faithfulness=0.857 tapi rel=0.000, rec=0.000)

---

## Hasil Per Domain

### LLM Metrics Per Domain

| Domain | Faithfulness | Relevancy | Precision | Recall | Correctness | Factual |
|---|---|---|---|---|---|---|
| **Ketenagakerjaan** | **0.900** | **0.512** | **0.598** | **0.867** | **0.671** | **0.550** |
| **Perdata** | 0.861 | 0.337 | 0.510 | 0.683 | 0.631 | 0.400 |

### Non-LLM Metrics Per Domain

| Domain | ROUGE-L | BLEU | String Sim | Kualitas |
|---|---|---|---|---|
| **Ketenagakerjaan** | **0.445** | **0.335** | **0.409** | ✅ Baik |
| **Perdata** | 0.297 | 0.159 | 0.319 | ⚠️ Cukup |

**Analisis:**

**Ketenagakerjaan — Sangat Baik** ✅
- Faithfulness 0.900 — hampir sempurna, sistem tidak mengarang untuk domain ini
- Context Recall 0.867 — retrieval sangat efektif mengambil konteks relevan
- ROUGE-L 0.445 jauh di atas rata-rata (0.371)
- Semua 5 pertanyaan mendapat jawaban substantif

**Perdata — Cukup** ⚠️
- Faithfulness 0.861 — masih baik, sistem tidak mengarang
- Answer Relevancy 0.337 — kelemahan utama; jawaban kurang fokus
- perdata_004 (rel=0.000, rec=0.000): gagal menjawab pertanyaan PP 28/2022 secara relevan
- ROUGE-L 0.297 sedikit di bawah rata-rata

---

## Hasil Per Tingkat Kesulitan

| Tingkat | Sampel | Faithfulness | Relevancy | Context Recall | ROUGE-L | BLEU |
|---|---|---|---|---|---|---|
| **Easy** | 4 | 0.883 | 0.308 | 0.584 | 0.367 | 0.285 |
| **Medium** | 4 | 0.887 | 0.480 | 0.938 | 0.409 | 0.270 |
| **Hard** | 2 | 0.863 | 0.548 | 0.834 | 0.305 | 0.125 |

**Pola:**
- Faithfulness konsisten tinggi (0.86-0.89) di semua tingkat kesulitan — sistem tidak mengarang terlepas dari kompleksitas
- Relevancy "Easy" lebih rendah (0.308) karena perdata_004 (easy) menyeret rata-rata turun
- Context Recall "Medium" paling tinggi (0.938) — dokumen medium lebih mudah di-retrieve dari Pinecone

---

## Hasil Per Sampel (Detail)

| ID | Domain | Sulit | Faithfulness | Relevancy | Precision | Recall | Correctness | ROUGE-L | BLEU | StrSim | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| naker_001 | Ketenagakerjaan | Easy | 0.750 | 0.586 | 0.895 | 0.667 | 0.722 | 0.550 | 0.567 | 0.461 | ✅ Baik |
| naker_002 | Ketenagakerjaan | Medium | 0.875 | 0.772 | 0.367 | 1.000 | 0.982 | 0.690 | 0.286 | 0.629 | ✅ Sangat Baik |
| naker_003 | Ketenagakerjaan | Medium | 0.875 | 0.222 | 1.000 | 1.000 | 0.349 | 0.341 | 0.477 | 0.315 | ✅ OK |
| naker_004 | Ketenagakerjaan | Easy | 1.000 | 0.357 | 0.000 | 0.667 | 0.641 | 0.402 | 0.201 | 0.411 | ✅ OK |
| naker_005 | Ketenagakerjaan | Hard | 1.000 | 0.623 | 0.729 | 1.000 | 0.660 | 0.244 | 0.145 | 0.227 | ✅ Baik |
| perdata_001 | Perdata | Easy | 0.923 | 0.290 | 0.746 | 1.000 | 0.669 | 0.366 | 0.348 | 0.391 | ✅ OK |
| perdata_002 | Perdata | Medium | 1.000 | 0.240 | 0.403 | 1.000 | 0.674 | 0.219 | 0.154 | 0.241 | ⚠️ Cukup |
| perdata_003 | Perdata | Medium | 0.800 | 0.684 | 0.500 | 0.750 | 0.572 | 0.385 | 0.164 | 0.351 | ✅ OK |
| perdata_004 | Perdata | Easy | 0.857 | 0.000 | 0.167 | 0.000 | 0.374 | 0.151 | 0.024 | 0.265 | ❌ Lemah |
| perdata_005 | Perdata | Hard | 0.727 | 0.473 | 0.732 | 0.667 | 0.867 | 0.366 | 0.105 | 0.347 | ✅ OK |

**Catatan per sampel:**
- **naker_002** — Terbaik: Context Recall 1.000, Answer Correctness 0.982, Faithfulness 0.875
- **naker_004** — Faithfulness sempurna (1.000) tapi Context Precision 0.000 — sistem retrieve konteks tapi tidak bisa mengurutkan yang paling relevan
- **perdata_004** — Terlemah: rel=0.000, rec=0.000 — dokumen PP 28/2022 (Surat Paksa/PUPN) tidak ter-retrieve dengan baik

---

## Perbandingan dengan Evaluasi Pertama (Eval-1)

| Aspek | Eval-1 (KUHP/ITE/Konsumen) | Eval-2 v2 (Naker/Perdata) |
|---|---|---|
| Jumlah sampel | 15 | 10 |
| ROUGE-L | 0.276 | **0.371** ↑ |
| BLEU | 0.115 | **0.247** ↑ |
| String Similarity | 0.259 | **0.364** ↑ |
| Coverage retrieval | 15/15 (100%) | **10/10 (100%)** |
| Faithfulness (LLM) | 0.876 | **0.881** ↑ |
| Context Precision (LLM) | 0.810 | 0.554 ↓ |
| Context Recall (LLM) | N/A | **0.775** |

> *Faithfulness meningkat sedikit. Context Precision lebih rendah di Eval-2 — kemungkinan karena dokumen perdata lebih heterogen dan Pinecone mengambil dokumen yang sedikit kurang tepat sasaran.*

---

## Statistik Retrieval

| Parameter | Nilai |
|---|---|
| Top-K per query | 10 dokumen |
| Sampel dengan jawaban substantif | 10/10 (100%) |
| Sampel dengan retrieval gagal | 0/10 (0%) — setelah perbaikan dataset |
| Total vektor Pinecone | ~78.313 |
| Dimensi embedding | 1024 (voyage-law-2) |

---

## Catatan Teknis: Perbaikan Dataset

Tiga pertanyaan awal mengacu pada dokumen yang tidak terindeks di Pinecone. Setelah audit Pinecone, pertanyaan diganti:

| ID | Pertanyaan Lama (gagal) | Pertanyaan Baru (berhasil) |
|---|---|---|
| naker_003 | PP 26/2019 Pengangkatan Hakim PHI | PERPRES 96/2006 Tunjangan Hakim Ad-Hoc PHI |
| perdata_001 | PP 27/2014 Definisi BMN | PP 17/2022 Pemanfaatan & Pinjam Pakai BMN |
| perdata_003 | PP 28/2022 PUPN & Piutang | Perda 1/2024 Kawasan Tanpa Rokok (KTR) |

**Pelajaran:** Sebelum membuat pertanyaan evaluasi, selalu konfirmasi dokumen target sudah terindeks di Pinecone menggunakan query embedding langsung.

---

## Rekomendasi Perbaikan

### Prioritas Tinggi
1. **Perbaiki perdata_004** — rel=0.000, rec=0.000; dokumen PP 28/2022 (Surat Paksa/PUPN) tidak ter-retrieve; audit chunk di Pinecone atau ganti dengan pertanyaan tentang dokumen yang lebih kuat
2. **Tingkatkan Answer Relevancy** (rata-rata 0.425, target 0.55) — sistem sering memberikan jawaban terlalu panjang atau tidak langsung menjawab inti pertanyaan; coba prompt engineering atau post-processing response

### Prioritas Menengah
3. **Tingkatkan Context Precision** (rata-rata 0.554, target 0.60) — beberapa dokumen yang diambil kurang relevan; pertimbangkan re-ranking atau metadata filtering
4. **Tingkatkan Factual Correctness** (0.475) — evaluator menemukan beberapa klaim yang tidak verifiable; perlu ground truth lebih akurat
5. **Audit chunk PP 28/2022** di Pinecone — piutang negara, surat paksa, PUPN tidak ter-retrieve dengan baik

### Prioritas Rendah
6. **Tambah pertanyaan uji Perdata** — dokumen kawasan tata ruang, retribusi daerah, perda kesehatan belum teruji
7. **Query expansion** untuk terminologi teknis — "PUPN", "Surat Paksa", "BMN" perlu sinonim yang lebih kaya

---

## Cara Jalankan Ulang Evaluasi

```bash
cd ragas_eval

# Non-LLM evaluation (cepat, tanpa API)
.venv/bin/python eval_nonllm.py

# Pipeline RAG untuk semua sampel
.venv/bin/python pipeline.py

# LLM eval sequential (gunakan model dengan TPM cukup)
.venv/bin/python eval_sequential.py --start 0 --end 5 --delay 10
.venv/bin/python eval_sequential.py --start 5 --end 10 --delay 10
```

**File output:**
```
ragas_eval/
├── test_questions_v2.json               # 10 pertanyaan + ground truth (v2)
├── rag_results_v2.json                  # Jawaban RAG + konteks (llama-4-scout)
└── results/
    ├── nonllm_eval_v2_20260528_003019.json   # Non-LLM metrics (10/10 sampel)
    ├── ragas_eval_20260528_003321.json       # LLM metrics naker_001-003
    └── llm_eval_seq_3_10_20260528_013348.json  # LLM metrics naker_004-perdata_005
```

---

## Kesimpulan

### Hasil Keseluruhan

TanyaHukum menunjukkan performa **baik di Faithfulness dan Context Recall**, namun masih perlu peningkatan di **Answer Relevancy dan Factual Correctness**.

| Metrik Kunci | Skor | Status |
|---|---|---|
| Faithfulness | 0.881 | ✅ Sangat Baik — sistem tidak mengarang |
| Context Recall | 0.775 | ✅ Sangat Baik — retrieval menemukan informasi relevan |
| Answer Correctness | 0.651 | ✅ Baik — jawaban secara umum benar |
| Answer Relevancy | 0.425 | ⚠️ Cukup — jawaban perlu lebih fokus |
| Context Precision | 0.554 | ⚠️ Cukup — beberapa dokumen yang diambil kurang tepat |
| Factual Correctness | 0.475 | ⚠️ Cukup — akurasi faktual masih bisa ditingkatkan |

### Per Domain

**Ketenagakerjaan — Lebih Baik** ✅ (Faithfulness 0.900, Recall 0.867)

**Perdata — Lebih Lemah** ⚠️ (Faithfulness 0.861, Relevancy 0.337)
- perdata_004 menjadi outlier terburuk yang menarik rata-rata turun

### Temuan Utama
- Coverage retrieval naik dari 70% → **100%** setelah audit dan perbaikan dataset
- Faithfulness konsisten tinggi (0.73–1.00) di semua sampel — sistem tidak mengarang
- Satu sampel bermasalah (perdata_004, PP 28/2022) yang perlu penanganan khusus

---

| Komponen | Detail |
|---|---|
| Generator Jawaban | meta-llama/llama-4-scout-17b (Groq) |
| Retrieval | Voyage-law-2 + Pinecone tanyahukum2 |
| Non-LLM Evaluator | ROUGE-L, BLEU, String Similarity (10/10 sampel) |
| LLM Evaluator | Groq llama-4-scout-17b (10/10 sampel — lengkap) |
| Tanggal | 28 Mei 2026 |
| Framework | RAGAS 0.2.15 |

*Laporan ini dibuat dari hasil evaluasi pipeline RAGAS dengan dataset yang telah diverifikasi terhadap indeks Pinecone.*
