import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { LRUCache } from "lru-cache";
import { sanitizePreferences, buildPreferenceInstructions } from "@/lib/chatPreferences";

const MAX_MESSAGE_LENGTH = 5000;

// 1. Import Prisma Client
import prisma from "@/lib/prisma";

// ==========================================================
// HELPER RAG (dipakai bersama oleh mode JSON & mode streaming)
// ==========================================================

const QUOTA_ERROR_MESSAGE = "Kuota AI hari ini telah habis. Silakan coba lagi nanti.";
const GENERIC_ERROR_MESSAGE = "Terjadi kesalahan pada server saat memproses pertanyaan hukum.";

// Model utama + cadangan. Kuota gratis Gemini dihitung per model, jadi jika kuota
// model utama habis, jawaban otomatis dibuat dengan model cadangan (bisa diatur via env).
// Gemini 2.5 Flash sudah ditutup Google untuk project baru → diganti Gemini 3.6 Flash (16 Okt 2026).
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const MODEL_CHAIN = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];

// Pilihan model/mode jawaban untuk pengguna (semua memakai API tier gratis).
// - provider "gemini": Google Gemini API (GOOGLE_API_KEY)
// - provider "groq"  : Groq API (GROQ_API_KEY) — sangat cepat, tapi batas gratis ±7–8 rb token/menit,
//                      sehingga konteks dibatasi ke `maxChunks` potongan teratas.
// Setiap model punya 2 mode: "Kilat" (langsung menjawab) dan "Berpikir" (berpikir dulu,
// ringkasannya ditampilkan di panel Proses). id mode harus sama dengan ModeToggle.jsx.
// reasoningEffort = tingkat penalaran model Groq (GPT-OSS selalu bernalar; Qwen bisa dimatikan).
const MODE_CONFIG = {
  fast:          { provider: "gemini", model: PRIMARY_MODEL, thinking: false },             // Gemini 3.6 Flash · Kilat
  deep:          { provider: "gemini", model: PRIMARY_MODEL, thinking: true },              // Gemini 3.6 Flash · Berpikir
  lite:          { provider: "gemini", model: "gemini-3.5-flash-lite", thinking: false },   // Gemini 3.5 Flash-Lite · Kilat (default UI)
  "lite-think":  { provider: "gemini", model: "gemini-3.5-flash-lite", thinking: true },    // Gemini 3.5 Flash-Lite · Berpikir
  "next-fast":   { provider: "gemini", model: "gemini-3.5-flash", thinking: false },        // Gemini 3.5 Flash · Kilat
  next:          { provider: "gemini", model: "gemini-3.5-flash", thinking: true },         // Gemini 3.5 Flash · Berpikir
  "gptoss-fast": { provider: "groq", model: "openai/gpt-oss-120b", thinking: false, reasoningEffort: "low", maxChunks: 20 },
  gptoss:        { provider: "groq", model: "openai/gpt-oss-120b", thinking: true, reasoningEffort: "medium", maxChunks: 20 },
  qwen:          { provider: "groq", model: "qwen/qwen3.8-27b", thinking: false, reasoningEffort: "none", maxChunks: 20 },
  "qwen-think":  { provider: "groq", model: "qwen/qwen3.8-27b", thinking: true, reasoningEffort: "medium", maxChunks: 20 },
};
const CHAT_MODES = Object.keys(MODE_CONFIG);

// Urutan percobaan untuk satu mode: model pilihan dulu, lalu model Gemini cadangan
// (dipakai jika kuota/batas model pilihan habis, atau key Groq tidak tersedia).
function modelChainFor(mode) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.deep;
  const selected = { provider: cfg.provider, model: cfg.model, maxChunks: cfg.maxChunks, reasoningEffort: cfg.reasoningEffort };
  const geminiFallbacks = MODEL_CHAIN
    .filter((m) => !(cfg.provider === "gemini" && m === cfg.model))
    .map((model) => ({ provider: "gemini", model }));
  const chain = [selected, ...geminiFallbacks];
  return chain.filter((c) => c.provider !== "groq" || process.env.GROQ_API_KEY);
}

function isQuotaError(err) {
  return err?.status === 429 || err?.status === 413 || err?.message?.includes("429") || err?.message?.includes("quota");
}

// Gangguan sementara di sisi penyedia model (server sibuk/overload) → boleh pindah ke model cadangan
function isTransientError(err) {
  const msg = err?.message || "";
  return [500, 502, 503, 504].includes(err?.status) || /\b50[0234]\b|overloaded|unavailable|high demand|failed to parse stream/i.test(msg);
}
const canUseFallback = (err) => isQuotaError(err) || isTransientError(err);

// Konfigurasi thinking per model Gemini.
// - Gemini 2.5: thinking aktif default; dimatikan dengan budget 0.
// - Gemini 3.x Flash: thinking aktif default; versi "lite" tidak berpikir kecuali diberi budget.
// - Gemini 3.x menolak budget 0 → untuk "tanpa thinking" dipakai default (lite) / level rendah.
function thinkingConfigFor(model, thinking) {
  const isGemini25 = model.startsWith("gemini-2.5");
  const isLite = model.includes("lite");
  if (!thinking) {
    if (isGemini25) return { thinkingBudget: 0 };
    return isLite ? undefined : { thinkingLevel: "low" };
  }
  if (isGemini25 || !isLite) return { includeThoughts: true };
  return { includeThoughts: true, thinkingBudget: 1024 };
}

// Streaming dari Groq (API kompatibel OpenAI). Menghasilkan bagian { type: "thinking" | "text", text }.
async function* streamGroq({ model, thinking, reasoningEffort, systemPrompt, message, signal }) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.2,
      max_tokens: 2048,
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      // Qwen: penalaran dipisah dari jawaban (bukan tag <think> di dalam teks)
      ...(model.startsWith("qwen/") ? { reasoning_format: "parsed" } : {}),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    }),
  });
  if (!res.ok) {
    const err = new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      let delta;
      try {
        delta = JSON.parse(line.slice(6)).choices?.[0]?.delta || {};
      } catch {
        continue;
      }
      // Mode Kilat: penalaran singkat GPT-OSS tidak ditampilkan
      if (delta.reasoning && thinking) yield { type: "thinking", text: delta.reasoning };
      if (delta.content) yield { type: "text", text: delta.content };
    }
  }
}

function createLlm(model = PRIMARY_MODEL, thinkingConfig) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model,
    temperature: 0.2,
    // Tanpa retry otomatis: jika kuota habis/server sibuk, langsung pindah ke model cadangan
    // (sebelumnya LangChain mengulang ±6 kali → pengguna menunggu ±100 detik).
    maxRetries: 0,
    ...(thinkingConfig ? { thinkingConfig } : {}),
  });
}

// Streaming dari Gemini (LangChain). Menghasilkan bagian { type: "thinking" | "text", text }.
async function* streamGemini({ model, thinking, systemPrompt, message, signal }) {
  const llm = createLlm(model, thinkingConfigFor(model, thinking));
  const chunks = await llm.stream([new SystemMessage(systemPrompt), new HumanMessage(message)], { signal });
  for await (const chunk of chunks) {
    yield* contentParts(chunk.content);
  }
}

// Klien dibuat sekali per instance server → koneksi (TLS) ke Voyage & Pinecone dipakai ulang.
// Pembukaan koneksi pertama ke server AS ±1 detik; panggilan berikutnya ±0,3 detik.
let ragClients = null;
function getRagClients() {
  if (!ragClients) {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    ragClients = {
      index: pc.Index(process.env.PINECONE_INDEX_V2),
      embeddings: new VoyageEmbeddings({
        apiKey: process.env.VOYAGEAI_API_KEY,
        inputType: "query",
        modelName: "voyage-law-2",
      }),
    };
  }
  return ragClients;
}

// Cache embedding pertanyaan (per instance server). Pertanyaan yang sama persis
// (mis. rekomendasi pertanyaan) tidak memanggil Voyage lagi → hemat kuota 3 request/menit.
const embeddingCache = new LRUCache({ max: 500, ttl: 24 * 60 * 60 * 1000 });

async function embedQuestion(message) {
  const key = message.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = embeddingCache.get(key);
  if (cached) return cached;
  const vector = await getRagClients().embeddings.embedQuery(message);
  embeddingCache.set(key, vector);
  return vector;
}

// ── Penyaring chunk sampah ────────────────────────────────────────────────────
// Tetap mengambil 50 chunk (tidak memangkas), hanya membuang yang jelas tidak berguna:
// duplikat persis dan tabel lampiran hasil OCR yang hampir tanpa teks.
// Chunk dengan skor tertinggi (MIN_KEEP teratas) tidak pernah dibuang.
const MIN_KEEP = 5;

function isNoiseChunk(text) {
  const t = (text || "").trim();
  if (t.length < 40) return true;
  const pipes = (t.match(/\|/g) || []).length;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  // Sel tabel kosong: banyak pemisah "|" tapi sedikit huruf
  if (pipes >= 10 && letters / t.length < 0.45) return true;
  // Tabel rapat: isi rata-rata per sel sangat pendek
  if (pipes >= 20 && letters / pipes < 6) return true;
  return false;
}

function cleanMatches(matches) {
  const seen = new Set();
  const kept = [];
  let removed = 0;
  matches.forEach((m, i) => {
    const text = (m.metadata?.text || "").trim();
    const key = text.replace(/\s+/g, " ").toLowerCase();
    if (key && seen.has(key)) {
      removed++;
      return;
    }
    if (key) seen.add(key);
    if (i >= MIN_KEEP && isNoiseChunk(text)) {
      removed++;
      return;
    }
    kept.push(m);
  });
  return { kept, removed };
}

// Ubah pertanyaan jadi vektor (Voyage) lalu cari potongan dokumen relevan (Pinecone)
async function retrieveDocuments(message) {
  const queryVector = await embedQuestion(message);
  const queryResponse = await getRagClients().index.query({
    vector: queryVector,
    topK: 50,
    includeMetadata: true,
  });

  const retrieved = queryResponse.matches || [];
  const { kept: matches, removed } = cleanMatches(retrieved);

  return { matches, context: buildContext(matches), retrievedCount: retrieved.length, filteredCount: removed };
}

// [PERBAIKAN 3]: Format konteks dokumen diperjelas biar AI gampang bacanya
function buildContext(matches) {
  return matches
    // Tanpa nomor urut ("DOKUMEN 1") agar AI mengutip nama dokumen, bukan nomornya.
    // Nama dokumen harus utuh supaya referensi di frontend bisa dicocokkan & dibuka.
    .map((m) => `[Sumber: ${m.metadata?.title|| 'Tidak diketahui'} | Hal: ${m.metadata?.page || '?'}]\n${m.metadata?.text || ''}`)
    .join("\n\n---\n\n");
}

function buildSystemPrompt(context, user, preferences = {}) {
  // ==========================================================
  // [PERBAIKAN 1]: Personalisasi sebagai "Konteks Pasif" (Invisible Context)
  // ==========================================================
  const userCustomInstructions = user.personalContext
    ? `\n[INFO LATAR BELAKANG PENGGUNA: "${user.personalContext}"]\n(PENTING: Gunakan info pengguna ini HANYA sebagai konteks untuk memahami niat pertanyaannya. JANGAN menyebutkan atau mengulang profil ini di dalam kalimat jawabanmu, kecuali pengguna bertanya langsung tentang dirinya. Berikan jawaban yang objektif dan to-the-point!)\n`
    : "";

  // ==========================================================
  // [PERBAIKAN 2 & 3]: System Prompt dengan Aturan Format & Kutipan yang Strict
  // ==========================================================
  return `Anda adalah TanyaHukum, asisten hukum Indonesia yang ahli, profesional, dan terpercaya.

TUGAS UTAMA: Jawab pertanyaan pengguna HANYA berdasarkan referensi Dokumen Hukum di bawah ini.

=== DOKUMEN HUKUM ===
${context}
=====================
${userCustomInstructions}

ATURAN WAJIB (HARUS DIIKUTI 100%):
1. KEAKURATAN: Jika jawaban tidak ada di Dokumen Hukum di atas, katakan: "Maaf, berdasarkan database hukum saat ini, saya belum menemukan informasi yang spesifik terkait pertanyaan Anda." Jangan pernah mengarang hukum/pasal!
2. FORMAT JAWABAN (MARKDOWN): Gunakan format Markdown agar mudah dibaca. 
   - Gunakan **huruf tebal (bold)** untuk istilah hukum atau poin penting.
   - Gunakan bullet points (-) atau penomoran (1, 2, 3) untuk menjabarkan daftar, syarat, atau langkah-langkah.
   - Buat paragraf yang singkat (maksimal 3-4 kalimat per paragraf).
3. KUTIPAN SUMBER YANG JELAS: Setiap kali Anda menjelaskan suatu aturan, sanksi, atau pasal, Anda WAJIB meletakkan sumbernya di akhir poin atau paragraf tersebut. 
   - Gunakan format ini: **(Sumber: [Nama Dokumen], Hal: [Nomor Halaman])**.
   - Tulis Nama Dokumen PERSIS seperti teks setelah "Sumber:" pada referensi di atas, lengkap dan tanpa disingkat. JANGAN menulis "DOKUMEN", nomor urut dokumen, atau hanya nomor pasal sebagai sumber.
   - Jika satu poin berasal dari beberapa dokumen, pisahkan dengan titik koma: **(Sumber: [Dokumen A], Hal: [x]; [Dokumen B], Hal: [y])**.
   - Contoh: "...wajib melaporkan lowongan kerja **(Sumber: Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023, Hal: 1-25)**."
4. GAYA BAHASA: Gunakan bahasa Indonesia yang baku namun mudah dipahami. Jangan bertele-tele dan jangan menggunakan salam pembuka yang berlebihan.
5. RINGKAS & LANGSUNG: Kalimat pertama harus langsung menjawab inti pertanyaan, tanpa kalimat pembuka seperti "Berdasarkan dokumen hukum yang tersedia". Usahakan jawaban sekitar 150-250 kata, KECUALI pengguna meminta penjelasan rinci. Jangan mengulang pertanyaan dan jangan menambahkan poin yang tidak ditanyakan. Aturan kutipan sumber (aturan 3) tetap wajib.${buildPreferenceInstructions(preferences)}`;
}

// Simpan pertanyaan & jawaban ke riwayat (dibuat SETELAH AI sukses menjawab)
async function recordUsage(userId) {
  try {
    await prisma.promptUsage.create({ data: { userId } });
  } catch (err) {
    console.error("Gagal mencatat pemakaian kuota:", err?.message);
  }
}

async function saveExchange({ existingChat, userId, message, answer }) {
  // Pastikan user memiliki minimal satu chat session (Relasi Wajib)
  const chatSession = existingChat
    ? existingChat
    : await prisma.chat.create({
        data: {
          title: message.slice(0, 30) + (message.length > 30 ? "..." : ""),
          user: {
            connect: { id: userId }
          }
        }
      });

  if (!chatSession) return null;

  // Kita gunakan Promise.all agar penyimpanan ke DB berjalan paralel dan lebih cepat
  // Timestamp eksplisit: jawaban AI selalu 1 ms setelah pertanyaan, agar urutan riwayat
  // tidak tertukar (sebelumnya keduanya bisa tersimpan di milidetik yang sama).
  const askedAt = new Date();
  const answeredAt = new Date(askedAt.getTime() + 1);

  await Promise.all([
    // Catat pemakaian kuota (tetap ada walau riwayat chat dihapus)
    prisma.promptUsage.create({ data: { userId } }),
    // Simpan pertanyaan User
    prisma.chatHistory.create({
      data: {
        role: "USER",
        content: message,
        createdAt: askedAt,
        chat: {
          connect: { id: chatSession.id }
        },
        user: {
          connect: { id: userId }
        }
      }
    }),
    // Simpan jawaban AI
    prisma.chatHistory.create({
      data: {
        role: "AI",
        content: answer,
        createdAt: answeredAt,
        chat: {
          connect: { id: chatSession.id }
        },
        user: {
          connect: { id: userId }
        }
      }
    }),
    // Update title jika ini chat baru
    prisma.chat.update({
      where: { id: chatSession.id },
      data: { updatedAt: new Date() }
    })
  ]);

  return chatSession;
}

// ==========================================================
// MODE STREAMING (transparansi proses)
// Mengirim event NDJSON (satu JSON per baris) secara bertahap:
//   { type: "step", step: "search" | "think" | "write", state: "active" | "done" }
//   { type: "sources", count, docs: [{ title, page }] }   ← dokumen yang benar-benar dibaca AI
//   { type: "thinking", text }                            ← ringkasan proses berpikir Gemini
//   { type: "text", text }                                ← potongan jawaban
//   { type: "done", chatId, answer, durationMs }
//   { type: "error", error, limitReached? }
// ==========================================================

const MAX_SOURCE_DOCS = 8;

// Ringkas daftar dokumen unik (urut relevansi) untuk ditampilkan di panel proses
function summarizeSources(matches) {
  const seen = new Map();
  for (const m of matches) {
    const title = m.metadata?.title;
    if (!title || seen.has(title)) continue;
    seen.set(title, { title, page: m.metadata?.page || null });
  }
  return { uniqueCount: seen.size, docs: [...seen.values()].slice(0, MAX_SOURCE_DOCS) };
}

// Konten chunk Gemini bisa string atau array bagian ({ type: "thinking" | "text" })
function contentParts(content) {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : [];
  if (!Array.isArray(content)) return [];
  return content
    .map((p) => {
      if (p?.type === "thinking") return { type: "thinking", text: p.thinking || "" };
      if (p?.type === "text") return { type: "text", text: p.text || "" };
      return null;
    })
    .filter((p) => p && p.text);
}

function streamChatResponse({ message, user, userId, existingChat, mode, preferences }) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const thinking = (MODE_CONFIG[mode] || MODE_CONFIG.deep).thinking;
  const modelChain = modelChainFor(mode);

  // Tombol "Stop" di frontend membatalkan request → stream di-cancel → pemanggilan AI ikut dihentikan
  const abortController = new AbortController();
  let cancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true; // klien memutus koneksi
        }
      };

      try {
        // 1. Cari dokumen
        send({ type: "step", step: "search", state: "active" });
        const { matches, context, retrievedCount, filteredCount } = await retrieveDocuments(message);
        if (cancelled) return; // dihentikan sebelum AI dipanggil → tidak ada yang disimpan
        const { uniqueCount, docs } = summarizeSources(matches);
        send({ type: "sources", count: retrievedCount, used: matches.length, filtered: filteredCount, uniqueCount, docs });
        send({ type: "step", step: "search", state: "done" });

        // 2. AI berpikir & menulis. Jika kuota model habis sebelum teks muncul,
        //    coba model cadangan berikutnya (transparan ke pengguna lewat event "model").
        send({ type: "step", step: "think", state: "active" });
        let answer = "";
        let writing = false;
        let usedModel = null;
        for (let i = 0; i < modelChain.length; i++) {
          const { provider, model, maxChunks, reasoningEffort } = modelChain[i];
          // Groq: konteks dibatasi ke potongan teratas agar muat dalam batas token gratis
          const usedMatches = maxChunks ? matches.slice(0, maxChunks) : matches;
          const systemPrompt = buildSystemPrompt(maxChunks ? buildContext(usedMatches) : context, user, preferences);
          send({ type: "model", model, provider, mode, fallback: i > 0, contextChunks: usedMatches.length });
          try {
            const parts = provider === "groq"
              ? streamGroq({ model, thinking, reasoningEffort, systemPrompt, message, signal: abortController.signal })
              : streamGemini({ model, thinking, systemPrompt, message, signal: abortController.signal });
            for await (const part of parts) {
              if (cancelled) break;
              if (part.type === "thinking") {
                send({ type: "thinking", text: part.text });
              } else {
                if (!writing) {
                  writing = true;
                  send({ type: "step", step: "think", state: "done" });
                  send({ type: "step", step: "write", state: "active" });
                }
                answer += part.text;
                send({ type: "text", text: part.text });
              }
            }
            usedModel = model;
            break;
          } catch (llmError) {
            if (cancelled) break; // dihentikan pengguna, bukan error
            console.error(`LLM Stream Error (${model}):`, llmError?.message);
            const canFallback = canUseFallback(llmError) && !writing && i < modelChain.length - 1;
            if (canFallback) continue;
            if (isQuotaError(llmError)) {
              send({ type: "error", error: QUOTA_ERROR_MESSAGE });
              return;
            }
            throw llmError;
          }
        }

        // Dihentikan pengguna (tombol Stop): tidak ada yang disimpan ke riwayat,
        // sehingga pertanyaan bisa diedit & dikirim ulang tanpa meninggalkan chat setengah jadi.
        // Jika AI sudah sempat menulis jawaban, kuota tetap terpakai (mencegah "Stop sebelum
        // selesai" dipakai untuk bertanya tanpa batas).
        if (cancelled) {
          if (answer.trim()) await recordUsage(userId);
          return;
        }

        if (!answer.trim()) throw new Error("Jawaban AI kosong");

        // 3. Simpan ke riwayat (sama seperti mode JSON)
        const chatSession = await saveExchange({ existingChat, userId, message, answer });
        if (!chatSession) {
          send({ type: "error", error: "Sesi chat tidak ditemukan" });
          return;
        }

        send({ type: "step", step: "write", state: "done" });
        send({ type: "done", chatId: chatSession.id, answer, model: usedModel, mode, durationMs: Date.now() - startedAt });
      } catch (error) {
        if (cancelled) return;
        console.error("API Chat Stream Error:", error);
        send({ type: "error", error: GENERIC_ERROR_MESSAGE });
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      }
    },
    cancel() {
      cancelled = true;
      abortController.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req) {
  try {
    // 1. Verifikasi identitas dari JWT cookie (bukan dari body)
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Silakan login kembali." }, { status: 401 });
    }

    const body = await req.json();
    const { message, chatId } = body;
    const userId = session.userId; // Selalu dari token, bukan dari body

    if (!message) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    // Batasi frekuensi request per user (proteksi biaya AI & spam)
    if (!rateLimit(userId, 15, "chat")) {
      return NextResponse.json(
        { error: "Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi sebentar." },
        { status: 429 }
      );
    }

    // Mode jawaban dari pengguna (whitelist). Default: "deep" (perilaku sebelumnya).
    const mode = CHAT_MODES.includes(body.mode) ? body.mode : "deep";
    // Preferensi gaya jawaban: hanya nilai dari whitelist yang dipakai
    const preferences = sanitizePreferences(body.preferences);

    if (chatId && typeof chatId !== "string") {
      return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
    }

    // Hitung jumlah chat user HARI INI
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Set waktu ke 00:00:00 hari ini

    // Tiga query baca dijalankan bersamaan (sebelumnya berurutan) → hemat ±2 kali
    // perjalanan bolak-balik ke database. Urutan pengecekan di bawah tetap sama.
    const [existingChat, user, chatsTodayCount] = await Promise.all([
      chatId ? prisma.chat.findUnique({ where: { id: chatId } }) : null,
      prisma.user.findUnique({
        where: { id: userId }
      }),
      // Kuota dihitung dari PromptUsage (bukan ChatHistory) agar menghapus riwayat
      // chat tidak mengembalikan kuota harian.
      prisma.promptUsage.count({
        where: {
          userId: userId,
          createdAt: {
            gte: startOfDay, // Lebih besar atau sama dengan awal hari ini
          }
        }
      }),
    ]);

    // Pastikan chatId (jika ada) benar-benar milik user ini SEBELUM memanggil AI
    if (chatId && (!existingChat || existingChat.userId !== userId)) {
      return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
    }

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak terdaftar." }, { status: 404 });
    }

    // ==========================================================
    // [MODIFIKASI PENTING]: Keputusan Gatekeeper dengan Jalur VIP
    // ==========================================================
    
    // Tolak JIKA user adalah FREE dan limitnya habis.
    // Jika user adalah PRO, blok if ini otomatis dilewati (Bypass)!
    if (user.tier === "FREE" && chatsTodayCount >= user.promptLimit) {
      return NextResponse.json(
        { 
          error: "Limit pertanyaan harian Anda sudah habis. Silakan upgrade ke PRO untuk akses tanpa batas.",
          limitReached: true // Flag khusus agar Frontend tahu ini error karena limit
        }, 
        { status: 403 }
      );
    }

    // ==========================================================
    // LOGIKA RAG AI
    // ==========================================================

    // Mode streaming (opsional): frontend mengirim { stream: true } untuk menerima
    // proses secara langsung (tahap pencarian, dokumen, ringkasan berpikir AI, teks jawaban).
    // Tanpa flag ini, respons tetap JSON seperti sebelumnya.
    if (body.stream === true) {
      return streamChatResponse({ message, user, userId, existingChat, mode, preferences });
    }

    const { context } = await retrieveDocuments(message);
    const promptMessages = [
      new SystemMessage(buildSystemPrompt(context, user, preferences)),
      new HumanMessage(message),
    ];

    // Mode JSON: thinking default model (perilaku lama), dengan model cadangan saat kuota habis
    let response;
    for (let i = 0; i < MODEL_CHAIN.length; i++) {
      try {
        response = await createLlm(MODEL_CHAIN[i]).invoke(promptMessages);
        break;
      } catch (llmError) {
        console.error(`LLM Error (${MODEL_CHAIN[i]}):`, llmError?.message);
        if (canUseFallback(llmError) && i < MODEL_CHAIN.length - 1) continue;
        if (isQuotaError(llmError)) {
          return NextResponse.json(
            { error: QUOTA_ERROR_MESSAGE },
            { status: 429 }
          );
        }
        throw llmError;
      }
    }

    // ==========================================================
    // 4. Rekam Jejak ke Database (Setelah AI sukses menjawab)
    // ==========================================================
    const chatSession = await saveExchange({ existingChat, userId, message, answer: response.content });

    if (!chatSession) {
       return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
    }

    // 5. Kembalikan respons ke Frontend
    return NextResponse.json({ answer: response.content, chatId: chatSession.id });

  } catch (error) {
    console.error("API Chat Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memproses pertanyaan hukum." }, 
      { status: 500 }
    );
  }
}

// ==========================================================
// [FITUR BARU]: GET Endpoint untuk Mengambil History Chat & List Chat
// ==========================================================
export async function GET(req) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "list" | "messages"
    const chatId = searchParams.get("chatId");

    if (!session || !userId || session.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // A. LIST SEMUA CHAT USER
    if (type === "list") {
      const chats = await prisma.chat.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ chats });
    }

    // B. AMBIL PESAN DALAM SATU CHAT
    if (chatId) {
      // Scope ke userId supaya user tidak bisa membaca chat milik orang lain
      const messages = await prisma.chatHistory.findMany({
        where: { chatId, userId },
        orderBy: [{ createdAt: "asc" }, { role: "asc" }], // timestamp kembar (data lama): USER dulu
      });
      return NextResponse.json({ history: messages });
    }

    // C. FALLBACK: SEMUA PESAN USER (Legacy)
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { role: "asc" }], // timestamp kembar (data lama): USER dulu
    });
    return NextResponse.json({ history });

  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

// ==========================================================
// [FITUR BARU]: PATCH Endpoint untuk Rename Chat
// ==========================================================
export async function PATCH(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { chatId, title } = body;

    if (!chatId || !title) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (typeof title !== "string" || title.length > 200) {
      return NextResponse.json({ error: "Judul chat maksimal 200 karakter" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || chat.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { title }
    });

    return NextResponse.json({ success: true, chat: updated });
  } catch (error) {
    console.error("API PATCH Error:", error);
    return NextResponse.json({ error: "Gagal merename chat" }, { status: 500 });
  }
}

// ==========================================================
// [FITUR BARU]: DELETE Endpoint untuk Hapus Chat
// ==========================================================
export async function DELETE(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "ID Chat diperlukan" }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || chat.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.chat.delete({ where: { id: chatId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API DELETE Error:", error);
    return NextResponse.json({ error: "Gagal menghapus chat" }, { status: 500 });
  }
}