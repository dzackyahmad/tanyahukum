// Preferensi gaya jawaban AI (menu Profil › Personalisasi).
// Dipakai bersama oleh klien (pilihan disimpan di localStorage) dan server (disisipkan ke prompt).
// Server HANYA menerima nilai dari daftar di bawah (whitelist), sehingga pengguna tidak bisa
// menyisipkan instruksi bebas lewat preferensi.

export const PREFERENCES_STORAGE_KEY = "tanyahukum_chat_prefs";

export const PREFERENCE_FIELDS = [
  {
    key: "style",
    label: "Gaya bahasa",
    description: "Cara AI menyampaikan penjelasan hukum",
    options: [
      { value: "default", label: "Default" },
      { value: "simple", label: "Sederhana", prompt: "Gunakan bahasa sehari-hari yang mudah dipahami orang awam. Jelaskan setiap istilah hukum dengan kata-kata sederhana." },
      { value: "formal", label: "Formal", prompt: "Gunakan bahasa Indonesia formal dan baku, seperti dalam surat atau dokumen resmi." },
      { value: "technical", label: "Teknis hukum", prompt: "Gunakan terminologi hukum yang tepat dan gaya analisis hukum, seperti untuk mahasiswa hukum atau praktisi." },
    ],
  },
  {
    key: "length",
    label: "Panjang jawaban",
    description: "Seberapa rinci penjelasan yang diberikan",
    options: [
      { value: "default", label: "Default" },
      { value: "short", label: "Ringkas", prompt: "Jawab sesingkat mungkin: inti jawaban dalam 2–4 kalimat atau poin (menggantikan target panjang pada aturan 5)." },
      { value: "detailed", label: "Detail", prompt: "Berikan penjelasan yang lebih lengkap, termasuk syarat, pengecualian, dan ketentuan terkait yang relevan dari dokumen (menggantikan target panjang pada aturan 5)." },
    ],
  },
  {
    key: "structure",
    label: "Judul dan daftar",
    description: "Penggunaan subjudul dan poin-poin",
    options: [
      { value: "default", label: "Default" },
      { value: "less", label: "Lebih sedikit", prompt: "Utamakan paragraf yang mengalir; gunakan daftar poin hanya bila benar-benar perlu, tanpa subjudul." },
      { value: "more", label: "Lebih banyak", prompt: "Susun jawaban dengan subjudul singkat dan daftar poin agar mudah dipindai." },
    ],
  },
  {
    key: "citation",
    label: "Kutipan pasal",
    description: "Cara menampilkan isi pasal yang dirujuk",
    options: [
      { value: "default", label: "Default" },
      { value: "quote", label: "Kutip bunyi pasal", prompt: "Bila bunyi pasal tersedia di dokumen, kutip langsung bagian yang relevan (dalam tanda kutip) sebelum menjelaskannya." },
      { value: "brief", label: "Rujukan saja", prompt: "Jangan mengutip bunyi pasal secara panjang; cukup jelaskan isinya dan sebutkan rujukannya." },
    ],
  },
  {
    key: "examples",
    label: "Contoh penerapan",
    description: "Ilustrasi kasus untuk memperjelas aturan",
    options: [
      { value: "default", label: "Default" },
      { value: "include", label: "Sertakan", prompt: "Bila relevan, sertakan satu contoh situasi singkat yang menggambarkan penerapan aturan tersebut, dan tandai bahwa itu hanya ilustrasi." },
      { value: "none", label: "Tanpa contoh", prompt: "Jangan menambahkan contoh atau ilustrasi kasus." },
    ],
  },
  {
    key: "nextSteps",
    label: "Langkah praktis",
    description: "Saran tindakan di akhir jawaban",
    options: [
      { value: "default", label: "Default" },
      { value: "include", label: "Sertakan", prompt: "Di akhir jawaban, bila relevan, tambahkan bagian singkat \"Langkah yang bisa dilakukan\" berisi langkah praktis umum (misalnya menyiapkan bukti, membaca pasal terkait, atau berkonsultasi dengan advokat/instansi berwenang). Jangan mengarang prosedur yang tidak ada di dokumen." },
    ],
  },
  {
    key: "language",
    label: "Bahasa jawaban",
    description: "Bahasa yang dipakai AI saat menjawab",
    options: [
      { value: "default", label: "Ikuti pertanyaan" },
      { value: "id", label: "Indonesia", prompt: "Selalu jawab dalam Bahasa Indonesia." },
      { value: "en", label: "English", prompt: "Always answer in English, but keep the names of Indonesian regulations, articles, and legal terms in their original Indonesian form." },
    ],
  },
];

const FIELD_BY_KEY = Object.fromEntries(PREFERENCE_FIELDS.map((f) => [f.key, f]));

// Ambil hanya kunci & nilai yang dikenal; nilai "default" atau tidak dikenal diabaikan.
export function sanitizePreferences(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const field = FIELD_BY_KEY[key];
    if (!field || typeof value !== "string" || value === "default") continue;
    if (field.options.some((o) => o.value === value)) out[key] = value;
  }
  return out;
}

// Teks instruksi untuk prompt sistem (string kosong jika semua default).
export function buildPreferenceInstructions(prefs) {
  const clean = sanitizePreferences(prefs);
  const lines = Object.entries(clean).map(([key, value]) => {
    const field = FIELD_BY_KEY[key];
    const option = field.options.find((o) => o.value === value);
    return `- ${field.label}: ${option.prompt}`;
  });
  if (!lines.length) return "";
  return `\nPREFERENSI GAYA JAWABAN PENGGUNA (ikuti selama tidak bertentangan dengan aturan 1 KEAKURATAN dan aturan 3 KUTIPAN SUMBER, yang tetap wajib):\n${lines.join("\n")}\n`;
}

// ── Klien: simpan/ambil dari localStorage ──
export function loadPreferences() {
  try {
    return sanitizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || "{}"));
  } catch {
    return {};
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitizePreferences(prefs)));
  } catch {}
}
