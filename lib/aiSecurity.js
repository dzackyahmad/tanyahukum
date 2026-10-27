import { randomBytes } from "crypto";

// Lapisan keamanan AI: deteksi upaya membocorkan informasi internal, pembungkus teks
// tidak tepercaya (dokumen hasil retrieval, konteks personal, pertanyaan), dan penjaga
// output yang memeriksa jawaban sebelum dikirim ke pengguna.

export const BLOCKED_REQUEST_MESSAGE =
  "Maaf, saya tidak dapat membagikan instruksi internal, kredensial, atau konfigurasi sistem TanyaHukum. Silakan ajukan pertanyaan seputar hukum Indonesia.";

export const BLOCKED_OUTPUT_MESSAGE =
  "Maaf, jawaban dihentikan karena memuat informasi internal sistem yang tidak boleh dibagikan. Silakan ajukan pertanyaan seputar hukum Indonesia.";

function normalizeInput(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Selalu dianggap permintaan instruksi internal, tanpa perlu kata kerja tambahan.
// Akhiran kepemilikan (-mu, -nya) ikut dikenali: "prompt sistemmu", "system promptnya".
const SYSTEM_PROMPT_TERMS =
  /\b(system|sistem)[\s_-]*(prompt|message|instructions?)(mu|nya)?\b|\bprompt[\s_-]*(sistem|system|internal|tersembunyi|rahasia)(mu|nya)?\b|\bdeveloper[\s_-]*(message|prompt|instructions?)\b|\binitial[\s_-]*(prompt|instructions?)\b|\bhidden[\s_-]*(prompt|instructions?)\b/;

// Instruksi/aturan milik AI itu sendiri. Sengaja sempit: frasa seperti "sebutkan aturan
// yang kamu ketahui tentang PHK" adalah pertanyaan hukum biasa dan tidak boleh terblokir.
const OWN_INSTRUCTION_PATTERNS = [
  /\b(instruksi|aturan|perintah|prompt)\s*(kamu|anda|mu)\b/,
  /\byour\s+(system\s+)?(instructions?|rules|prompt|guidelines)\b/,
  /\b(instruksi|aturan|perintah)\s+(yang|yg)\s+(diberikan|dikasih|ditanamkan)\s+(kepadamu|ke ?kamu|kepada ?anda|ke ?anda)\b/,
  /\b(aturan|instruksi|perintah)\s+(yang|yg)\s+(kamu|anda)\s+(ikuti|patuhi|pegang|jalankan|terima)\b/,
  /\b(ulangi|salin|tulis ulang|cetak|print|repeat|output)\b.{0,30}\b(teks|tulisan|pesan|kalimat|instruksi|kata-kata|everything|text|words)\b.{0,20}\b(di atas|above|sebelum ini|before this)\b/,
];

// Istilah teknis (hampir tidak pernah muncul di pertanyaan hukum) vs istilah umum yang bisa
// muncul di pertanyaan hukum ("jika password anda dicuri, apakah termasuk pidana?").
const TECH_SECRET = "(api[\\s_-]?keys?|kunci api|secret[\\s_-]?keys?|jwt[\\s_-]?secret|private[\\s_-]?keys?|database[_\\s-]?url|connection string|string koneksi|system configuration)";
const GENERIC_SECRET = "(password|kata sandi|kredensial|credentials?|access[\\s_-]?tokens?|token (rahasia|api|akses)|konfigurasi)";
const SELF_PERSON = "(kamu|anda|mu|milikmu)";
const SELF_SYSTEM = "(tanyahukum|aplikasi ini|sistem ini|website ini|situs ini|server (ini|kamu|anda|tanyahukum))";
const REQUEST_VERB = "(berikan|beri ?tahu|tampilkan|tunjukkan|sebutkan|bocorkan|bagikan|kirim(kan)?|give me|show me|tell me|share|reveal)";

// Kata rahasia harus jelas merujuk ke sistem ini: "api key kamu", "your api key",
// "password database TanyaHukum", "berikan password kamu". "Sanksi mencuri kredensial
// orang lain" dan "jika password anda dicuri" tidak terblokir.
const SECRET_ABOUT_SYSTEM = [
  new RegExp(`\\b${TECH_SECRET}\\b.{0,25}\\b(${SELF_PERSON.slice(1, -1)}|${SELF_SYSTEM.slice(1, -1)})\\b`),
  new RegExp(`\\b${GENERIC_SECRET}\\b.{0,25}\\b${SELF_SYSTEM}\\b`),
  new RegExp(`\\b${REQUEST_VERB}\\b.{0,15}\\b${GENERIC_SECRET}\\b.{0,15}\\b${SELF_PERSON}\\b`),
  new RegExp(`\\byour\\b.{0,15}\\b(${TECH_SECRET.slice(1, -1)}|${GENERIC_SECRET.slice(1, -1)})\\b`),
];

// Istilah yang praktis tidak pernah muncul dalam pertanyaan hukum.
const INTERNAL_CONFIG_REQUEST =
  /(\.env\b|\benv(ironment)? var(iable)?s?\b|\bvariabel lingkungan\b|\bprocess\.env\b)/;

const OVERRIDE_PATTERNS = [
  /\b(abaikan|lupakan|acuhkan|langgar|hapus|batalkan)\b.{0,30}\b(semua |seluruh )?(instruksi|aturan|perintah|batasan|ketentuan)\b/,
  /\bjangan\b.{0,15}\b(ikuti|patuhi|hiraukan)\b.{0,20}\b(instruksi|aturan|perintah|batasan)\b/,
  /\b(ignore|disregard|forget|override|bypass)\b.{0,30}\b(previous|prior|above|all|earlier|your)?\s*(instructions?|rules|guidelines|restrictions)\b/,
  /\b(jailbreak|dan mode|developer mode|mode pengembang|god mode|tanpa batasan|tanpa sensor|without (any )?restrictions|no restrictions|unfiltered)\b/,
  /\b(kamu|anda|you)\b.{0,10}\b(sekarang|kini|now)\b.{0,10}\b(adalah|menjadi|are|is)\b/,
  /\b(berpura-pura|pura-pura|bertindak sebagai|act as|pretend)\b.{0,40}\b(tanpa|bebas|without|no)\b.{0,15}\b(aturan|batasan|rules|restrictions)\b/,
];

// Deteksi di sisi server sebelum AI dipanggil.
// - block: permintaan membocorkan instruksi sistem, kredensial, atau konfigurasi internal
//   → dijawab dengan pesan tetap, AI tidak dipanggil, kuota tidak terpakai.
// - flags: pola upaya mengubah aturan (jailbreak/override) → tetap dijawab, tetapi prompt
//   menambahkan pengingat dan aturan tetap berlaku.
export function detectPromptAttack(message) {
  const text = normalizeInput(message);
  const flags = [];
  let block = false;
  let reason = null;

  if (SYSTEM_PROMPT_TERMS.test(text) || OWN_INSTRUCTION_PATTERNS.some((re) => re.test(text))) {
    block = true;
    reason = "system_prompt";
  } else if (SECRET_ABOUT_SYSTEM.some((re) => re.test(text)) || INTERNAL_CONFIG_REQUEST.test(text)) {
    block = true;
    reason = "credentials";
  }
  if (OVERRIDE_PATTERNS.some((re) => re.test(text))) flags.push("override");

  return { block, reason, flags };
}

// Penanda acak per request: batas blok data dan "canary" untuk mendeteksi kebocoran prompt.
export function createRequestSecrets() {
  return {
    boundary: randomBytes(6).toString("hex"),
    canary: `TH-${randomBytes(5).toString("hex").toUpperCase()}`,
  };
}

const RESERVED_TAGS = /<\s*\/?\s*(dokumen_hukum|dokumen|konteks_pengguna|pertanyaan_pengguna|instruksi_sistem|system)\b[^>]*>/gi;

// Teks tidak tepercaya tidak boleh bisa menutup/membuka blok data buatan server.
export function neutralizeUntrusted(text, boundary) {
  let out = String(text ?? "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  if (boundary) out = out.split(boundary).join("[dihapus]");
  return out.replace(RESERVED_TAGS, (tag) => tag.replace(/</g, "‹").replace(/>/g, "›"));
}

// ── Penjaga output ──────────────────────────────────────────────────────────

const SECRET_OUTPUT_PATTERNS = [
  /AIza[0-9A-Za-z_-]{30,}/, // Google API key
  /\bgsk_[0-9A-Za-z]{20,}/, // Groq
  /\bsk-[0-9A-Za-z_-]{20,}/, // OpenAI-style
  /\bpcsk_[0-9A-Za-z_-]{20,}/, // Pinecone
  /\bpa-[0-9A-Za-z_-]{30,}/, // Voyage
  /\beyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/, // JWT
  /\bpostgres(ql)?:\/\/[^\s:/]+:[^\s@/]+@/i, // URL database berkredensial
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const SECRET_ENV_NAMES = [
  "JWT_SECRET", "GOOGLE_API_KEY", "GOOGLE_API_KEY_EVAL", "GROQ_API_KEY", "VOYAGEAI_API_KEY",
  "PINECONE_API_KEY", "DATABASE_URL", "DIRECT_URL", "MIDTRANS_SERVER_KEY", "SMTP_PASS",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export function secretEnvValues(env = process.env) {
  return SECRET_ENV_NAMES.map((name) => env[name]).filter((v) => typeof v === "string" && v.length >= 8);
}

// Cukup menahan beberapa karakter terakhir agar kredensial/penanda tidak sempat terkirim
// utuh sebelum terdeteksi (kunci API terpanjang di atas < 80 karakter).
const DEFAULT_HOLDBACK = 96;

export function scanOutput(text, { canary, fingerprints = [], secrets = [] } = {}) {
  if (!text) return null;
  if (canary && text.includes(canary)) return "canary";
  if (secrets.some((s) => text.includes(s))) return "secret_value";
  if (SECRET_OUTPUT_PATTERNS.some((re) => re.test(text))) return "secret_pattern";
  if (fingerprints.filter((f) => text.includes(f)).length >= 2) return "system_prompt";
  return null;
}

// Dipakai saat streaming: push() mengembalikan teks yang aman dikirim sekarang, atau
// alasan pemblokiran. flush() dipanggil setelah stream model selesai.
export function createOutputGuard({ canary, fingerprints = [], secrets = secretEnvValues(), holdback = DEFAULT_HOLDBACK } = {}) {
  let full = "";
  let emitted = 0;
  let blocked = null;
  const check = () => (blocked ||= scanOutput(full, { canary, fingerprints, secrets }));
  return {
    push(chunk) {
      if (blocked) return { emit: "", blocked };
      full += chunk;
      if (check()) return { emit: "", blocked };
      const end = Math.max(emitted, full.length - holdback);
      const emit = full.slice(emitted, end);
      emitted = end;
      return { emit, blocked: null };
    },
    flush() {
      if (blocked || check()) return { emit: "", blocked };
      const emit = full.slice(emitted);
      emitted = full.length;
      return { emit, blocked: null };
    },
    reset() {
      full = "";
      emitted = 0;
      blocked = null;
    },
    get text() {
      return full;
    },
  };
}
