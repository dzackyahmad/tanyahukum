# Folder PPL-II — Dokumentasi Pengujian & Evaluasi (16 Okt 2026)

| Berkas | Isi |
|---|---|
| [RINGKASAN_1_HALAMAN.md](RINGKASAN_1_HALAMAN.md) | **Ringkasan menyeluruh** (1 halaman): fitur, semua hasil pengujian, bug, dan rekomendasi |
| [dokumentasi_teknis_updated_16Okt.md](dokumentasi_teknis_updated_16Okt.md) | **Dokumentasi teknis lengkap** (berdiri sendiri): deskripsi aplikasi, 25 fungsi, kebutuhan fungsional & non-fungsional, arsitektur, ERD, 40 endpoint API, implementasi AI, dan seluruh hasil evaluasi |
| [PENGUJIAN_BLACKBOX.md](PENGUJIAN_BLACKBOX.md) | Black box testing: cara kerja, ringkasan, dan daftar 231 kasus uji |
| [PENGUJIAN_WHITEBOX.md](PENGUJIAN_WHITEBOX.md) | White box testing: coverage per berkas, kompleksitas per handler, bug yang ditemukan |
| [PENGUJIAN_NONFUNGSIONAL.md](PENGUJIAN_NONFUNGSIONAL.md) | Performa endpoint, E2E browser, uji Stop, keamanan statis, kuota tier gratis |
| [EVALUASI_RESPONSE_TIME.md](EVALUASI_RESPONSE_TIME.md) | Evaluasi response time: faktor penyebab, baseline vs optimasi, 6 model/mode, uji Stop |
| [EVALUASI_RAGAS_V3.md](EVALUASI_RAGAS_V3.md) | Evaluasi kualitas RAG dengan Ragas: 10 pertanyaan baru × 5 model final |
| [catatan_revisi_doktek.md](catatan_revisi_doktek.md) | Daftar revisi untuk `Dokumentasi Teknis PPL1-TanyaHukum-2026.docx` per bab: yang salah, yang kurang, dan prioritasnya |
| [plan.md](plan.md) | Rencana pembaruan setiap gambar di docx: tetap/perbarui/baru, sumber PlantUML, dan isi yang harus diubah |
| [scripts/](scripts/) | Skrip uji response time (`e2e_response_time.mjs`) dan uji tombol Stop (`e2e_stop.mjs`) |
| [ragas/](ragas/) | Dataset (`test_questions_v3.json`), jawaban (`rag_results_v3.json`), skrip, dan hasil (`results/`) |

Semua skrip dijalankan dari folder `tanyahukum/`. Kunci API dibaca dari `.env.local` (tidak ada rahasia di folder ini). Folder `ragas/.venv` adalah virtualenv Python lokal; buat ulang dengan:

```powershell
python -m venv tests/PPL-II/ragas/.venv
tests/PPL-II/ragas/.venv/Scripts/pip install "ragas==0.2.15" "langchain<0.4" "langchain-core<0.4" "langchain-community<0.4" "langchain-openai<0.4" "langchain-google-genai<3" rouge-score sacrebleu rapidfuzz python-dotenv
```
