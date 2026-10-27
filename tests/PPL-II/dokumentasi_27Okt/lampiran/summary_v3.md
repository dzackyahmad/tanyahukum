### Skor per model (rata-rata 10 pertanyaan)

| Model · Mode | n | Faithfulness | Answer Relevancy | Answer Correctness | Factual Correctness | ROUGE-L | BLEU | String Sim. | Rata-rata 4 metrik LLM | Waktu rata-rata |
|---|---|---|---|---|---|---|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | 10 | 0.986 | 0.914 | 0.787 | 0.789 | 0.546 | 0.248 | 0.430 | **0.869** | 7.2 dtk |
| Gemini 3.5 Flash-Lite · Berpikir | 10 | 1.000 | 0.906 | 0.811 | 0.771 | 0.550 | 0.220 | 0.445 | **0.872** | 9.5 dtk |
| Gemini 3.6 Flash · Kilat | 10 | 1.000 | 0.931 | 0.829 | 0.771 | 0.558 | 0.258 | 0.450 | **0.883** | 17.3 dtk |
| Gemini 3.6 Flash · Berpikir | 10 | 1.000 | 0.931 | 0.792 | 0.723 | 0.558 | 0.250 | 0.453 | **0.862** | 16.7 dtk |
| Gemini 3.5 Flash · Kilat | 10 | 1.000 | 0.928 | 0.822 | 0.776 | 0.544 | 0.233 | 0.439 | **0.881** | 11.9 dtk |
| Gemini 3.5 Flash · Berpikir | 10 | 1.000 | 0.924 | 0.804 | 0.796 | 0.566 | 0.261 | 0.445 | **0.881** | 12.1 dtk |
| GPT-OSS 120B · Kilat | 10 | 0.948 | 0.913 | 0.730 | 0.646 | 0.443 | 0.247 | 0.347 | **0.809** | 5.5 dtk |
| GPT-OSS 120B · Berpikir | 10 | 0.956 | 0.930 | 0.762 | 0.646 | 0.437 | 0.241 | 0.373 | **0.823** | 5.8 dtk |
| Qwen 3.8 · Kilat | 10 | 0.986 | 0.955 | 0.796 | 0.735 | 0.519 | 0.301 | 0.441 | **0.868** | 5.0 dtk |
| Qwen 3.8 · Berpikir | 10 | 0.978 | 0.945 | 0.673 | 0.655 | 0.477 | 0.264 | 0.381 | **0.813** | 5.8 dtk |

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
| Gemini 3.5 Flash-Lite · Berpikir | 0.837 | 0.785 |
| Gemini 3.6 Flash · Kilat | 0.892 | 0.767 |
| Gemini 3.6 Flash · Berpikir | 0.793 | 0.792 |
| Gemini 3.5 Flash · Kilat | 0.863 | 0.780 |
| Gemini 3.5 Flash · Berpikir | 0.829 | 0.779 |
| GPT-OSS 120B · Kilat | 0.767 | 0.693 |
| GPT-OSS 120B · Berpikir | 0.747 | 0.776 |
| Qwen 3.8 · Kilat | 0.786 | 0.806 |
| Qwen 3.8 · Berpikir | 0.702 | 0.645 |

### Answer Correctness per tingkat kesulitan

| Model · Mode | easy | medium | hard |
|---|---|---|---|
| Gemini 3.5 Flash-Lite · Kilat | 0.860 | 0.656 | 0.903 |
| Gemini 3.5 Flash-Lite · Berpikir | 0.825 | 0.722 | 0.961 |
| Gemini 3.6 Flash · Kilat | 0.838 | 0.755 | 0.961 |
| Gemini 3.6 Flash · Berpikir | 0.799 | 0.743 | 0.876 |
| Gemini 3.5 Flash · Kilat | 0.848 | 0.736 | 0.941 |
| Gemini 3.5 Flash · Berpikir | 0.778 | 0.793 | 0.879 |
| GPT-OSS 120B · Kilat | 0.734 | 0.691 | 0.801 |
| GPT-OSS 120B · Berpikir | 0.746 | 0.771 | 0.774 |
| Qwen 3.8 · Kilat | 0.717 | 0.809 | 0.929 |
| Qwen 3.8 · Berpikir | 0.624 | 0.683 | 0.754 |

### Per pertanyaan (Answer Correctness)

| ID | Gemini 3.5 Flash-Lite · Kilat | Gemini 3.5 Flash-Lite · Berpikir | Gemini 3.6 Flash · Kilat | Gemini 3.6 Flash · Berpikir | Gemini 3.5 Flash · Kilat | Gemini 3.5 Flash · Berpikir | GPT-OSS 120B · Kilat | GPT-OSS 120B · Berpikir | Qwen 3.8 · Kilat | Qwen 3.8 · Berpikir | CP@10 | CR Gemini | CR Groq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| naker_101 | 0.820 | 0.821 | 0.865 | 0.766 | 0.824 | 0.798 | 0.517 | 0.628 | 0.558 | 0.449 | 1.000 | 1.000 | 0.250 |
| naker_102 | 0.661 | 0.719 | 0.877 | 0.841 | 0.841 | 0.782 | 0.776 | 0.782 | 0.867 | 0.757 | 1.000 | 0.333 | 0.333 |
| naker_103 | 0.758 | 0.915 | 0.906 | 0.932 | 0.865 | 0.872 | 0.941 | 0.712 | 0.828 | 0.872 | 0.333 | 1.000 | 1.000 |
| naker_104 | 0.870 | 0.800 | 0.881 | 0.666 | 0.895 | 0.928 | 0.764 | 0.629 | 0.738 | 0.611 | 0.500 | 1.000 | 1.000 |
| naker_105 | 0.814 | 0.929 | 0.928 | 0.761 | 0.891 | 0.766 | 0.836 | 0.987 | 0.941 | 0.820 | 0.250 | 1.000 | 1.000 |
| perdata_101 | 0.886 | 0.994 | 0.744 | 0.994 | 0.994 | 0.524 | 0.841 | 0.992 | 0.703 | 0.646 | 1.000 | 1.000 | 1.000 |
| perdata_102 | 0.614 | 0.468 | 0.645 | 0.611 | 0.647 | 0.612 | 0.533 | 0.860 | 0.879 | 0.581 | 1.000 | 1.000 | 1.000 |
| perdata_103 | 0.863 | 0.686 | 0.862 | 0.771 | 0.678 | 0.862 | 0.814 | 0.736 | 0.869 | 0.790 | 1.000 | 1.000 | 1.000 |
| perdata_104 | 0.592 | 0.784 | 0.590 | 0.590 | 0.591 | 0.904 | 0.514 | 0.732 | 0.663 | 0.521 | 0.625 | 1.000 | 1.000 |
| perdata_105 | 0.992 | 0.993 | 0.994 | 0.992 | 0.991 | 0.992 | 0.765 | 0.562 | 0.917 | 0.687 | 0.833 | 1.000 | 1.000 |
