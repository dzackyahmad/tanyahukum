### Skor per model (rata-rata 10 pertanyaan)

| Model · Mode | n | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Rata-rata 4 metrik LLM | Waktu rata-rata |
|---|---|---|---|---|---|---|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | 10 | 0.986 | 0.914 | 0.787 | 0.789 | 0.546 | 0.248 | 0.430 | **0.869** | 7.2 dtk |
| Gemini 3.6 Flash · Kilat | 10 | 1.000 | 0.931 | 0.829 | 0.771 | 0.558 | 0.258 | 0.450 | **0.883** | 17.3 dtk |
| Gemini 3.5 Flash · Berpikir | 10 | 1.000 | 0.924 | 0.804 | 0.796 | 0.566 | 0.261 | 0.445 | **0.881** | 12.1 dtk |
| GPT-OSS 120B · Berpikir | 10 | 0.956 | 0.930 | 0.762 | 0.646 | 0.437 | 0.241 | 0.373 | **0.823** | 5.8 dtk |
| Qwen 3.8 · Kilat | 10 | 0.986 | 0.955 | 0.796 | 0.735 | 0.519 | 0.301 | 0.441 | **0.868** | 5.0 dtk |

### Skor retrieval (sama untuk semua model)

| Metrik | Skor |
|---|---|
| Context Precision@10 | 0.754 |
| Context Recall (Gemini, semua potongan) | 0.933 |
| Context Recall (Groq, 20 teratas) | 0.858 |

### Answer Correctness per domain

| Model · Mode | Ketenagakerjaan | Perdata |
|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | 0.785 | 0.789 |
| Gemini 3.6 Flash · Kilat | 0.892 | 0.767 |
| Gemini 3.5 Flash · Berpikir | 0.829 | 0.779 |
| GPT-OSS 120B · Berpikir | 0.747 | 0.776 |
| Qwen 3.8 · Kilat | 0.786 | 0.806 |

### Answer Correctness per tingkat kesulitan

| Model · Mode | easy | medium | hard |
|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | 0.860 | 0.656 | 0.903 |
| Gemini 3.6 Flash · Kilat | 0.838 | 0.755 | 0.961 |
| Gemini 3.5 Flash · Berpikir | 0.778 | 0.793 | 0.879 |
| GPT-OSS 120B · Berpikir | 0.746 | 0.771 | 0.774 |
| Qwen 3.8 · Kilat | 0.717 | 0.809 | 0.929 |

### Per pertanyaan (Answer Correctness)

| ID | Gemini 3.5 Flash-Lite · Kilat | Gemini 3.6 Flash · Kilat | Gemini 3.5 Flash · Berpikir | GPT-OSS 120B · Berpikir | Qwen 3.8 · Kilat | CP@10 | CR Gemini | CR Groq |
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
