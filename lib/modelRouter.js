// Pemilihan model, urutan fallback, klasifikasi error, dan status batas pemakaian model.

// Model Gemini "3.6 Flash" bisa diganti lewat env tanpa mengubah kode.
export const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Pilihan model/mode untuk pengguna (semua memakai API tier gratis).
// - provider "gemini": Google Gemini API (GOOGLE_API_KEY)
// - provider "groq"  : Groq API (GROQ_API_KEY) — batas gratis ±8 rb token/menit, sehingga
//                      konteks dibatasi ke `maxChunks` potongan teratas.
// id mode harus sama dengan components/features/chat/ModeToggle.jsx.
export const MODE_CONFIG = {
  fast:          { provider: "gemini", model: PRIMARY_MODEL, thinking: false, label: "Gemini 3.6 Flash · Kilat" },
  deep:          { provider: "gemini", model: PRIMARY_MODEL, thinking: true, label: "Gemini 3.6 Flash · Berpikir" },
  lite:          { provider: "gemini", model: "gemini-3.5-flash-lite", thinking: false, label: "Gemini 3.5 Flash-Lite · Kilat" },
  "lite-think":  { provider: "gemini", model: "gemini-3.5-flash-lite", thinking: true, label: "Gemini 3.5 Flash-Lite · Berpikir" },
  "next-fast":   { provider: "gemini", model: "gemini-3.5-flash", thinking: false, label: "Gemini 3.5 Flash · Kilat" },
  next:          { provider: "gemini", model: "gemini-3.5-flash", thinking: true, label: "Gemini 3.5 Flash · Berpikir" },
  "gptoss-fast": { provider: "groq", model: "openai/gpt-oss-120b", thinking: false, reasoningEffort: "low", maxChunks: 20, label: "GPT-OSS 120B · Kilat" },
  gptoss:        { provider: "groq", model: "openai/gpt-oss-120b", thinking: true, reasoningEffort: "medium", maxChunks: 20, label: "GPT-OSS 120B · Berpikir" },
  qwen:          { provider: "groq", model: "qwen/qwen3.8-27b", thinking: false, reasoningEffort: "none", maxChunks: 20, label: "Qwen 3.8 · Kilat" },
  "qwen-think":  { provider: "groq", model: "qwen/qwen3.8-27b", thinking: true, reasoningEffort: "medium", maxChunks: 20, label: "Qwen 3.8 · Berpikir" },
};
export const CHAT_MODES = Object.keys(MODE_CONFIG);
export const DEFAULT_MODE = "deep";

const MODEL_NAMES = {
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3.5-flash": "Gemini 3.5 Flash",
  "openai/gpt-oss-120b": "GPT-OSS 120B",
  "qwen/qwen3.8-27b": "Qwen 3.8",
};
export const modelName = (model) => MODEL_NAMES[model] || (model === PRIMARY_MODEL ? "Gemini 3.6 Flash" : model);

// Urutan prioritas fallback dari evaluasi Ragas v3 lengkap 10 mode (27 Okt 2026): rata-rata 4 metrik
// LLM (Faithfulness, Answer Relevancy, Answer Correctness, Factual Correctness) dibulatkan 2 desimal;
// bila setara, yang lebih cepat didahulukan. Skor (n=10 semua): 3.5 Flash Kilat 0,881 · 3.5 Flash Berpikir 0,881 ·
// 3.6 Flash Kilat 0,883 · Qwen Kilat 0,868 · Flash-Lite Kilat 0,869 · Flash-Lite Berpikir 0,872 ·
// 3.6 Flash Berpikir 0,862 · GPT-OSS Berpikir 0,823 · GPT-OSS Kilat 0,809 · Qwen Berpikir 0,813.
// Sumber: tests/PPL-II/EVALUASI_RAGAS_V3.md. Bisa ditimpa lewat env MODEL_PRIORITY.
export const DEFAULT_MODE_PRIORITY = ["next-fast", "next", "fast", "qwen", "lite", "lite-think", "deep", "gptoss", "gptoss-fast", "qwen-think"];

export function modePriority(env = process.env) {
  const custom = (env.MODEL_PRIORITY || "").split(",").map((s) => s.trim()).filter((m) => MODE_CONFIG[m]);
  return [...new Set([...custom, ...DEFAULT_MODE_PRIORITY])];
}

// ── Cooldown: model yang baru kena batas dilewati sementara ──────────────────
// Disimpan per instance server (in-memory) dan disalin dari tabel ModelStatus sebelum setiap
// pertanyaan (lib/modelStatus.js → syncCooldowns), sehingga semua instance tahu model mana yang
// habis. Model yang sedang cooldown tidak dibuang, hanya dipindah ke urutan terakhir, sehingga
// tetap dicoba bila semua model lain gagal.
const cooldowns = new Map(); // model → { until, reason }

export function markCooldown(model, ms, reason, now = Date.now()) {
  if (!ms || ms <= 0) return;
  const until = now + ms;
  const current = cooldowns.get(model);
  if (!current || current.until < until) cooldowns.set(model, { until, reason });
}

export function cooldownOf(model, now = Date.now()) {
  const c = cooldowns.get(model);
  if (!c) return null;
  if (c.until <= now) {
    cooldowns.delete(model);
    return null;
  }
  return c;
}

export function clearCooldowns() {
  cooldowns.clear();
}

// Rantai model untuk satu pertanyaan: mode pilihan pengguna dulu, lalu model lain sesuai
// prioritas Ragas — yang jenis modenya sama (Kilat/Berpikir) didahulukan. Satu model hanya
// muncul sekali (batas kuota berlaku per model, bukan per mode).
export function buildModelChain(mode, { env = process.env, now = Date.now() } = {}) {
  const selectedId = MODE_CONFIG[mode] ? mode : DEFAULT_MODE;
  const selected = MODE_CONFIG[selectedId];
  const priority = modePriority(env);
  const ordered = [
    selectedId,
    ...priority.filter((id) => MODE_CONFIG[id].thinking === selected.thinking),
    ...priority.filter((id) => MODE_CONFIG[id].thinking !== selected.thinking),
  ];
  const seen = new Set();
  const chain = [];
  for (const id of ordered) {
    const cfg = MODE_CONFIG[id];
    if (cfg.provider === "groq" && !env.GROQ_API_KEY) continue;
    if (seen.has(cfg.model)) continue;
    seen.add(cfg.model);
    chain.push({ mode: id, ...cfg });
  }
  const ready = chain.filter((c) => !cooldownOf(c.model, now));
  const cooling = chain.filter((c) => cooldownOf(c.model, now)).map((c) => ({ ...c, coolingDown: true }));
  return [...ready, ...cooling];
}

// ── Klasifikasi error penyedia model ─────────────────────────────────────────
const COOLDOWN_MS = {
  limit: 60_000,
  limitDaily: 15 * 60_000,
  auth: 10 * 60_000,
  transient: 20_000,
  timeout: 30_000,
};

export const FALLBACK_REASON_TEXT = {
  limit: "mencapai batas penggunaan (kuota/token)",
  auth: "akses ke model sedang ditolak penyedia",
  transient: "server penyedia sedang sibuk atau terganggu",
  timeout: "tidak merespons dalam batas waktu",
  empty: "tidak menghasilkan jawaban",
  bad_request: "menolak permintaan",
  unknown: "mengalami gangguan",
  limit_daily: "kuota hariannya habis",
  cooldown: "baru saja mencapai batas penggunaan",
  cooldown_daily: "kuota hariannya sudah habis untuk hari ini",
  unavailable: "sedang tidak tersedia",
};

// Durasi gaya Groq "2m59.52s" / "1h2m3s" / "7.5s" → milidetik
function parseDurationMs(text) {
  const m = String(text).match(/^(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?$/);
  if (!m || !(m[1] || m[2] || m[3])) return null;
  return Math.ceil(((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (parseFloat(m[3]) || 0)) * 1000);
}

function parseRetryAfterMs(err) {
  if (typeof err?.retryAfterMs === "number") return err.retryAfterMs;
  const msg = String(err?.message || "");
  const m = msg.match(/retry (?:in|after) ([\d.]+)\s*s/i) || msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000);
  const ms = msg.match(/try again in ([\d.]+)ms/i);
  if (ms) return Math.ceil(parseFloat(ms[1]));
  const groq = msg.match(/try again in ((?:\d+h)?(?:\d+m)?(?:[\d.]+s)?)/i);
  return groq ? parseDurationMs(groq[1]) : null;
}

// Kuota harian Gemini tier gratis pulih tengah malam waktu Pasifik (America/Los_Angeles).
// Pada hari pergantian jam musim panas selisihnya bisa ±1 jam; cukup untuk perkiraan cooldown.
const DAY_MS = 24 * 60 * 60 * 1000;
export function msUntilPacificMidnight(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hourCycle: "h23", hour: "numeric", minute: "numeric", second: "numeric" })
      .formatToParts(new Date(now))
      .map((p) => [p.type, p.value])
  );
  const elapsed = ((+parts.hour * 60 + +parts.minute) * 60 + +parts.second) * 1000 + (now % 1000);
  return Math.max(60_000, DAY_MS - elapsed);
}

export function classifyModelError(err, { provider, now = Date.now() } = {}) {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || "");
  if (err?.timeout) return { kind: "timeout", fallback: true, cooldownMs: COOLDOWN_MS.timeout };
  // Model selesai tanpa teks jawaban (mis. Gemini mode berpikir sesekali hanya mengirim penalaran)
  if (err?.emptyResponse) return { kind: "empty", fallback: true, cooldownMs: 0 };
  if (err?.name === "AbortError" || /aborted|abortError/i.test(msg)) return { kind: "aborted", fallback: false, cooldownMs: 0 };
  if (status === 429 || status === 413 || /\b(429|413)\b|quota|rate.?limit|resource.?exhausted|too many requests|request too large|tokens per (minute|day)|context.?length|maximum context/i.test(msg)) {
    const daily = /per ?day|daily|PerDay|RPD|TPD/i.test(msg);
    const retryMs = parseRetryAfterMs(err);
    if (!daily) return { kind: "limit", fallback: true, cooldownMs: retryMs ?? COOLDOWN_MS.limit };
    // Kuota harian: Gemini sering menyarankan "retry in 30s" walau kuota baru pulih tengah malam
    // Pasifik → dijeda sampai saat itu. Groq menyebut sisa waktunya sendiri ("try again in 7m12s").
    const cooldownMs = provider === "gemini"
      ? Math.max(retryMs ?? 0, msUntilPacificMidnight(now))
      : retryMs ?? COOLDOWN_MS.limitDaily;
    return { kind: "limit", daily: true, fallback: true, cooldownMs };
  }
  if (status === 401 || status === 403 || /api key not valid|invalid api key|permission|unauthori[sz]ed|forbidden/i.test(msg)) {
    return { kind: "auth", fallback: true, cooldownMs: COOLDOWN_MS.auth };
  }
  if ([500, 502, 503, 504].includes(status) || /\b50[0234]\b|overloaded|unavailable|high demand|failed to parse stream|fetch failed|econnreset|etimedout|socket hang up|network/i.test(msg)) {
    return { kind: "transient", fallback: true, cooldownMs: COOLDOWN_MS.transient };
  }
  if (status === 400 || status === 404) return { kind: "bad_request", fallback: true, cooldownMs: 0 };
  return { kind: "unknown", fallback: true, cooldownMs: 0 };
}

// ── Batas waktu streaming ────────────────────────────────────────────────────
// Jika model tidak mengirim apa pun (pikiran/teks) dalam firstChunkMs, atau berhenti di tengah
// lebih dari stallMs, percobaan dihentikan dan dianggap gagal (lalu pindah ke model berikutnya).
export const STREAM_TIMEOUTS = { firstChunkMs: 45_000, stallMs: 30_000 };

export async function* withStreamTimeouts(iterable, { firstChunkMs, stallMs, onTimeout } = STREAM_TIMEOUTS) {
  const it = iterable[Symbol.asyncIterator]();
  let first = true;
  while (true) {
    const ms = first ? firstChunkMs : stallMs;
    const next = it.next();
    next.catch(() => {}); // bila kalah balapan dengan timeout, penolakannya diabaikan
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const e = new Error(`Model tidak merespons dalam ${Math.round(ms / 1000)} detik`);
        e.timeout = true;
        onTimeout?.();
        reject(e);
      }, ms);
    });
    let res;
    try {
      res = await Promise.race([next, timeout]);
    } finally {
      clearTimeout(timer);
    }
    if (res.done) return;
    first = false;
    yield res.value;
  }
}

// ── Status batas penyedia (untuk halaman Penggunaan) ────────────────────────
// Groq mengirim sisa batas di header setiap respons. Nilainya untuk SELURUH aplikasi (satu API
// key), dicatat per instance server → ditampilkan sebagai estimasi. Gemini tidak menyediakan
// informasi sisa kuota.
const providerStatus = new Map(); // model → snapshot

export function recordRateLimitHeaders(model, headers, now = Date.now()) {
  const get = (name) => headers?.get?.(name);
  const num = (name) => {
    const v = Number(get(name));
    return Number.isFinite(v) ? v : null;
  };
  const snapshot = {
    limitRequests: num("x-ratelimit-limit-requests"),
    remainingRequests: num("x-ratelimit-remaining-requests"),
    limitTokens: num("x-ratelimit-limit-tokens"),
    remainingTokens: num("x-ratelimit-remaining-tokens"),
    resetRequests: get("x-ratelimit-reset-requests") || null,
    resetTokens: get("x-ratelimit-reset-tokens") || null,
    observedAt: now,
  };
  if (snapshot.remainingRequests === null && snapshot.remainingTokens === null) return;
  providerStatus.set(model, snapshot);
}

export function rateLimitSnapshot(model) {
  return providerStatus.get(model) || null;
}

// ── Pemakaian harian model (peringatan ≥ 70%) ───────────────────────────────
// Berlaku untuk seluruh aplikasi (satu API key per penyedia), bukan per pengguna.
// - Groq : header x-ratelimit-*-requests = batas & sisa request per HARI → "aktual".
// - Gemini: tidak ada info sisa kuota. Bila batas harian diisi di env GEMINI_DAILY_LIMITS
//           ("gemini-3.6-flash=20,gemini-3.5-flash=20"), pemakaian diperkirakan dari jumlah
//           jawaban yang tercatat hari ini → "estimasi". Tanpa env, tidak ada persentase.
export const DAILY_WARNING_RATIO = 0.7;

export function geminiDailyLimits(env = process.env) {
  const limits = new Map();
  for (const pair of String(env.GEMINI_DAILY_LIMITS || "").split(",")) {
    const [model, n] = pair.split("=").map((s) => s?.trim());
    const limit = Number(n);
    if (model && Number.isFinite(limit) && limit > 0) limits.set(model, limit);
  }
  return limits;
}

// Kuota harian Groq terisi kembali sedikit demi sedikit, jadi data header yang lebih tua dari
// ini tidak dipakai (bisa memberi peringatan palsu).
const GROQ_SNAPSHOT_MAX_AGE_MS = 60 * 60 * 1000;

export function dailyUsageLevel({ provider, snapshot, used, limit, now = Date.now() }) {
  let level = null;
  const fresh = snapshot && now - new Date(snapshot.observedAt).getTime() <= GROQ_SNAPSHOT_MAX_AGE_MS;
  if (provider === "groq" && fresh && snapshot.limitRequests > 0 && snapshot.remainingRequests !== null && snapshot.remainingRequests !== undefined) {
    level = { used: Math.max(0, snapshot.limitRequests - snapshot.remainingRequests), limit: snapshot.limitRequests, source: "aktual" };
  } else if (provider === "gemini" && limit > 0 && Number.isFinite(used)) {
    level = { used, limit, source: "estimasi" };
  }
  if (!level) return null;
  const ratio = Math.min(1, level.used / level.limit);
  return { ...level, percent: Math.round(ratio * 100), warning: ratio >= DAILY_WARNING_RATIO };
}

export function clearRateLimitSnapshots() {
  providerStatus.clear();
}
