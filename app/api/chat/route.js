import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { LRUCache } from "lru-cache";
import { sanitizePreferences } from "@/lib/chatPreferences";
import {
  MODE_CONFIG, CHAT_MODES, DEFAULT_MODE, buildModelChain, classifyModelError, markCooldown, cooldownOf,
  withStreamTimeouts, STREAM_TIMEOUTS, FALLBACK_REASON_TEXT, recordRateLimitHeaders, rateLimitSnapshot,
  modelName, dailyUsageLevel, geminiDailyLimits,
} from "@/lib/modelRouter";
import {
  detectPromptAttack, createRequestSecrets, createOutputGuard, scanOutput, secretEnvValues,
  BLOCKED_REQUEST_MESSAGE, BLOCKED_OUTPUT_MESSAGE,
} from "@/lib/aiSecurity";
import { classifyQuestion, assessEvidence, consultationNote, findUnverifiedCitations, unverifiedCitationNote } from "@/lib/legalGuardrails";
import { buildSystemPrompt, buildUserContent, PROMPT_FINGERPRINTS } from "@/lib/chatPrompt";
import { dailyLimitFor, downgradeIfExpired, effectivePlan, startOfQuotaDay, quotaStatus } from "@/lib/subscription";
import { saveModelStatus, rateLimitData, syncCooldowns, geminiAnswersToday } from "@/lib/modelStatus";

const MAX_MESSAGE_LENGTH = 5000;

// 1. Import Prisma Client
import prisma from "@/lib/prisma";

// ==========================================================
// HELPER RAG (dipakai bersama oleh mode JSON & mode streaming)
// ==========================================================

const QUOTA_ERROR_MESSAGE = "Kuota semua model AI sedang habis atau mencapai batas penggunaan. Silakan coba lagi beberapa menit lagi.";
const GENERIC_ERROR_MESSAGE = "Terjadi kesalahan pada server saat memproses pertanyaan hukum.";

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

// Streaming dari Groq (API kompatibel OpenAI).
// Menghasilkan bagian { type: "thinking" | "text", text } dan { type: "usage", input, output }.
async function* streamGroq({ model, thinking, reasoningEffort, systemPrompt, userContent, signal }) {
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
        { role: "user", content: userContent },
      ],
    }),
  });
  // Sisa batas per menit dari header (dipakai halaman Penggunaan sebagai estimasi)
  recordRateLimitHeaders(model, res.headers);
  if (!res.ok) {
    const err = new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
    err.status = res.status;
    const retryAfter = Number(res.headers?.get?.("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = retryAfter * 1000;
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
      let payload;
      try {
        payload = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      const delta = payload.choices?.[0]?.delta || {};
      // Mode Kilat: penalaran singkat GPT-OSS tidak ditampilkan
      if (delta.reasoning && thinking) yield { type: "thinking", text: delta.reasoning };
      if (delta.content) yield { type: "text", text: delta.content };
      const usage = payload.usage || payload.x_groq?.usage;
      if (usage) yield { type: "usage", input: usage.prompt_tokens ?? null, output: usage.completion_tokens ?? null };
    }
  }
}

function createLlm(model, thinkingConfig) {
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

// Streaming dari Gemini (LangChain).
// Menghasilkan bagian { type: "thinking" | "text", text } dan { type: "usage", input, output }.
async function* streamGemini({ model, thinking, systemPrompt, userContent, signal }) {
  const llm = createLlm(model, thinkingConfigFor(model, thinking));
  const chunks = await llm.stream([new SystemMessage(systemPrompt), new HumanMessage(userContent)], { signal });
  // LangChain melaporkan token per potongan sebagai SELISIH dari potongan sebelumnya,
  // jadi totalnya adalah penjumlahan.
  let usage = null;
  for await (const chunk of chunks) {
    yield* contentParts(chunk.content);
    const u = chunk.usage_metadata;
    if (u) {
      usage = {
        input: (usage?.input ?? 0) + (u.input_tokens ?? 0),
        output: (usage?.output ?? 0) + (u.output_tokens ?? 0),
      };
    }
  }
  if (usage) yield { type: "usage", ...usage };
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

  return { matches, retrievedCount: retrieved.length, filteredCount: removed };
}

// Potongan tanpa judul di database ditulis "Tidak diketahui" di blok dokumen (lib/chatPrompt.js);
// kutipan dengan nama itu tetap berasal dari dokumen yang dibaca, jadi tidak ditandai.
const docTitlesOf = (matches) => [...new Set(matches.map((m) => m.metadata?.title || "Tidak diketahui"))];

// Catatan pemakaian kuota: dibuat untuk setiap jawaban (termasuk yang dihentikan setelah AI
// menulis), beserta model dan jumlah token dari penyedia (halaman Penggunaan).
function usageData(userId, info = {}) {
  return {
    userId,
    model: info.model ?? null,
    mode: info.mode ?? null,
    inputTokens: info.inputTokens ?? null,
    outputTokens: info.outputTokens ?? null,
  };
}

async function recordUsage(userId, info) {
  try {
    await prisma.promptUsage.create({ data: usageData(userId, info) });
  } catch (err) {
    console.error("Gagal mencatat pemakaian kuota:", err?.message);
  }
}

// Simpan pertanyaan & jawaban ke riwayat (dibuat SETELAH AI sukses menjawab)
async function saveExchange({ existingChat, userId, message, answer, usage }) {
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
    prisma.promptUsage.create({ data: usageData(userId, usage) }),
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

// Alasan cooldown yang disimpan: "limit_daily" dibedakan agar UI bisa menulis "kuota harian habis"
const cooldownReasonOf = (info) => (info.daily ? "limit_daily" : info.kind);

// Model gagal → dijeda di memori instance ini + tabel ModelStatus (dibaca instance lain lewat
// syncCooldowns). Tidak pernah menunda/menggagalkan jawaban.
function coolDown(c, info) {
  if (!info.cooldownMs) return;
  markCooldown(c.model, info.cooldownMs, cooldownReasonOf(info));
  saveModelStatus(prisma, c.model, c.provider, {
    cooldownUntil: new Date(Date.now() + info.cooldownMs),
    cooldownReason: cooldownReasonOf(info),
  }, { force: true });
}

// Kuota pertanyaan pengguna setelah pertanyaan ini tercatat (frontend memberi peringatan ≥ 70%)
const quotaAfterAnswer = (q) => (q ? quotaStatus(q.used + 1, q.limit) : null);

// Peringatan bila kuota harian model yang menjawab (seluruh aplikasi) sudah ≥ 70% terpakai.
// Groq: dari header respons barusan (aktual). Gemini: estimasi, hanya bila GEMINI_DAILY_LIMITS diisi.
async function modelDailyWarning(c) {
  try {
    let level;
    if (c.provider === "groq") {
      level = dailyUsageLevel({ provider: "groq", snapshot: rateLimitSnapshot(c.model) });
    } else {
      const limit = geminiDailyLimits().get(c.model);
      if (!limit) return null;
      const used = (await geminiAnswersToday(prisma, [c.model])).get(c.model) || 0;
      level = dailyUsageLevel({ provider: "gemini", used, limit });
    }
    return level?.warning ? { model: c.model, name: modelName(c.model), percent: level.percent, source: level.source } : null;
  } catch {
    return null;
  }
}

function persistAvailable(model, provider) {
  saveModelStatus(prisma, model, provider, {
    ...rateLimitData(rateLimitSnapshot(model)),
    cooldownUntil: null,
    cooldownReason: null,
  });
}

// Catatan guardrail yang ditambahkan server setelah jawaban selesai (tidak bergantung model)
function guardrailNotes(answer, { questionType, docTitles }) {
  const unverified = findUnverifiedCitations(answer, docTitles);
  return {
    text: unverifiedCitationNote(unverified) + consultationNote(answer, questionType),
    unverifiedCount: unverified.length,
  };
}

// ==========================================================
// MODE STREAMING (transparansi proses)
// Mengirim event NDJSON (satu JSON per baris) secara bertahap:
//   { type: "step", step: "search" | "think" | "write", state: "active" | "done" }
//   { type: "sources", count, docs: [{ title, page }] }   ← dokumen yang benar-benar dibaca AI
//   { type: "model", model, provider, mode, fallback }    ← model yang sedang dicoba
//   { type: "fallback", fromLabel, toLabel, reason, restarted } ← model berganti otomatis
//   { type: "reset" }                                     ← jawaban diulang dari awal
//   { type: "thinking", text }                            ← ringkasan proses berpikir model
//   { type: "text", text }                                ← potongan jawaban
//   { type: "done", chatId, answer, durationMs, blocked? }
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

function streamChatResponse({ message, user, userId, existingChat, mode, preferences, attack, questionType, quota }) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const selectedLabel = MODE_CONFIG[mode].label;

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
        // 0. Permintaan membocorkan instruksi/kredensial: dijawab dengan pesan tetap.
        //    AI tidak dipanggil, tidak ada yang disimpan, kuota tidak terpakai.
        if (attack.block) {
          console.warn("[AI-SECURITY] Permintaan informasi internal diblok:", attack.reason);
          send({ type: "text", text: BLOCKED_REQUEST_MESSAGE });
          send({ type: "done", chatId: existingChat?.id ?? null, answer: BLOCKED_REQUEST_MESSAGE, model: null, mode, blocked: true, durationMs: Date.now() - startedAt });
          return;
        }

        // Cooldown dari instance lain dibaca bersamaan dengan pencarian dokumen (tidak menambah waktu tunggu)
        const cooldownSync = syncCooldowns(prisma);

        // 1. Cari dokumen
        send({ type: "step", step: "search", state: "active" });
        const { matches, retrievedCount, filteredCount } = await retrieveDocuments(message);
        if (cancelled) return; // dihentikan sebelum AI dipanggil → tidak ada yang disimpan
        const { uniqueCount, docs } = summarizeSources(matches);
        send({ type: "sources", count: retrievedCount, used: matches.length, filtered: filteredCount, uniqueCount, docs });
        send({ type: "step", step: "search", state: "done" });

        const evidence = assessEvidence(matches);
        const docTitles = docTitlesOf(matches);
        const { boundary, canary } = createRequestSecrets();
        const guard = createOutputGuard({ canary, fingerprints: PROMPT_FINGERPRINTS, secrets: secretEnvValues() });

        // 2. AI berpikir & menulis. Model dicoba sesuai rantai prioritas (hasil Ragas). Jika gagal
        //    (kuota/token habis, server sibuk, timeout, dll.), pindah ke model berikutnya dan
        //    pengguna diberi tahu; bila gagal di tengah jawaban, jawaban diulang dari awal.
        send({ type: "step", step: "think", state: "active" });
        await cooldownSync;
        const chain = buildModelChain(mode);
        let writing = false;
        let used = null;
        let usage = null;
        let blockedOutput = null;
        let lastError = null;
        // Model pilihan dilewati sejak awal: sedang cooldown, atau tidak tersedia (mis. tanpa key Groq)
        const selectedCooldown = cooldownOf(MODE_CONFIG[mode].model);
        let previous = chain[0].mode !== mode
          ? {
              label: selectedLabel,
              kind: !chain.some((c) => c.mode === mode && c.coolingDown) ? "unavailable"
                : selectedCooldown?.reason === "limit_daily" ? "cooldown_daily" : "cooldown",
              emitted: false,
            }
          : null;

        for (let i = 0; i < chain.length; i++) {
          const c = chain[i];
          if (previous) {
            if (previous.emitted) send({ type: "reset" });
            send({ type: "fallback", fromLabel: previous.label, toLabel: c.label, reason: FALLBACK_REASON_TEXT[previous.kind] || FALLBACK_REASON_TEXT.unknown, restarted: previous.emitted });
          }

          // Groq: konteks dibatasi ke potongan teratas agar muat dalam batas token gratis
          const usedMatches = c.maxChunks ? matches.slice(0, c.maxChunks) : matches;
          const systemPrompt = buildSystemPrompt({
            preferences, boundary, canary, questionType, evidence,
            attackFlags: attack.flags, hasPersonalContext: !!user.personalContext,
          });
          const userContent = buildUserContent({ matches: usedMatches, personalContext: user.personalContext, message, boundary });
          send({ type: "model", model: c.model, provider: c.provider, mode: c.mode, fallback: c.mode !== mode, contextChunks: usedMatches.length });

          // Setiap percobaan punya pembatal sendiri (timeout), tetap ikut berhenti bila pengguna menekan Stop
          const attempt = new AbortController();
          const stopAttempt = () => attempt.abort();
          abortController.signal.addEventListener("abort", stopAttempt);
          guard.reset();
          usage = null;
          let emitted = false;
          try {
            const parts = c.provider === "groq"
              ? streamGroq({ model: c.model, thinking: c.thinking, reasoningEffort: c.reasoningEffort, systemPrompt, userContent, signal: attempt.signal })
              : streamGemini({ model: c.model, thinking: c.thinking, systemPrompt, userContent, signal: attempt.signal });
            for await (const part of withStreamTimeouts(parts, { ...STREAM_TIMEOUTS, onTimeout: stopAttempt })) {
              if (cancelled) break;
              if (part.type === "usage") {
                usage = part;
              } else if (part.type === "thinking") {
                emitted = true;
                send({ type: "thinking", text: part.text });
              } else {
                if (!writing) {
                  writing = true;
                  send({ type: "step", step: "think", state: "done" });
                  send({ type: "step", step: "write", state: "active" });
                }
                emitted = true;
                const r = guard.push(part.text);
                if (r.blocked) {
                  blockedOutput = r.blocked;
                  stopAttempt();
                  break;
                }
                if (r.emit) send({ type: "text", text: r.emit });
              }
            }
            if (!cancelled && !blockedOutput) {
              const r = guard.flush();
              if (r.blocked) blockedOutput = r.blocked;
              else if (r.emit) send({ type: "text", text: r.emit });
              // Selesai tanpa teks jawaban = gagal → pindah ke model berikutnya
              if (!blockedOutput && !guard.text.trim()) {
                throw Object.assign(new Error(`Model ${c.model} selesai tanpa teks jawaban`), { emptyResponse: true });
              }
            }
            used = c;
            break;
          } catch (llmError) {
            if (cancelled) break; // dihentikan pengguna, bukan error
            const info = classifyModelError(llmError, { provider: c.provider });
            console.error(`LLM Stream Error (${c.model}) [${cooldownReasonOf(info)}]:`, llmError?.message);
            coolDown(c, info);
            lastError = info;
            previous = { label: c.label, kind: cooldownReasonOf(info), emitted };
            if (!info.fallback) break;
          } finally {
            abortController.signal.removeEventListener("abort", stopAttempt);
          }
        }

        let answer = guard.text;
        const usageInfo = { model: used?.model, mode: used?.mode, inputTokens: usage?.input, outputTokens: usage?.output };

        // Dihentikan pengguna (tombol Stop): tidak ada yang disimpan ke riwayat,
        // sehingga pertanyaan bisa diedit & dikirim ulang tanpa meninggalkan chat setengah jadi.
        // Jika AI sudah sempat menulis jawaban, kuota tetap terpakai (mencegah "Stop sebelum
        // selesai" dipakai untuk bertanya tanpa batas).
        if (cancelled) {
          if (answer.trim()) await recordUsage(userId, usageInfo);
          return;
        }

        if (!used) {
          send({ type: "error", error: lastError?.kind === "limit" ? QUOTA_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE });
          return;
        }

        // Jawaban memuat informasi internal (prompt sistem, kredensial) → diganti, tidak disimpan.
        // Model sudah menjawab, jadi kuota tetap terpakai.
        if (blockedOutput) {
          console.warn("[AI-SECURITY] Jawaban diblok:", blockedOutput);
          await recordUsage(userId, usageInfo);
          send({ type: "reset" });
          send({ type: "text", text: BLOCKED_OUTPUT_MESSAGE });
          send({ type: "step", step: "write", state: "done" });
          send({ type: "done", chatId: existingChat?.id ?? null, answer: BLOCKED_OUTPUT_MESSAGE, model: used.model, mode: used.mode, blocked: true, quota: quotaAfterAnswer(quota), durationMs: Date.now() - startedAt });
          return;
        }

        if (!answer.trim()) throw new Error("Jawaban AI kosong");

        // 3. Guardrail setelah jawaban selesai: sumber yang tidak ada di dokumen & catatan konsultasi
        const notes = guardrailNotes(answer, { questionType, docTitles });
        if (notes.text) {
          send({ type: "text", text: notes.text });
          answer += notes.text;
        }

        // 4. Simpan ke riwayat (sama seperti mode JSON)
        const chatSession = await saveExchange({ existingChat, userId, message, answer, usage: usageInfo });
        if (!chatSession) {
          send({ type: "error", error: "Sesi chat tidak ditemukan" });
          return;
        }
        persistAvailable(used.model, used.provider);
        const modelWarning = await modelDailyWarning(used);

        send({ type: "step", step: "write", state: "done" });
        send({
          type: "done", chatId: chatSession.id, answer, model: used.model, mode: used.mode,
          questionType, evidence: evidence.level, unverifiedCitations: notes.unverifiedCount,
          quota: quotaAfterAnswer(quota), modelWarning,
          durationMs: Date.now() - startedAt,
        });
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
    const mode = CHAT_MODES.includes(body.mode) ? body.mode : DEFAULT_MODE;
    // Preferensi gaya jawaban: hanya nilai dari whitelist yang dipakai
    const preferences = sanitizePreferences(body.preferences);

    if (chatId && typeof chatId !== "string") {
      return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
    }

    // Hitung jumlah pertanyaan user HARI INI (tengah malam waktu server)
    const startOfDay = startOfQuotaDay();

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
    // Gatekeeper kuota: PRO aktif tanpa batas; FREE (dan PRO 30 hari yang sudah berakhir)
    // dibatasi per hari.
    // ==========================================================
    if (effectivePlan(user).expired) await downgradeIfExpired(prisma, user);
    const dailyLimit = dailyLimitFor(user);
    if (dailyLimit !== null && chatsTodayCount >= dailyLimit) {
      return NextResponse.json(
        {
          error: "Limit pertanyaan harian Anda sudah habis. Silakan upgrade ke PRO untuk akses tanpa batas.",
          limitReached: true // Flag khusus agar Frontend tahu ini error karena limit
        },
        { status: 403 }
      );
    }

    // Keamanan AI & guardrail hukum (deteksi di server sebelum AI dipanggil)
    const attack = detectPromptAttack(message);
    const { type: questionType } = classifyQuestion(message);

    // ==========================================================
    // LOGIKA RAG AI
    // ==========================================================

    // Mode streaming (opsional): frontend mengirim { stream: true } untuk menerima
    // proses secara langsung (tahap pencarian, dokumen, ringkasan berpikir AI, teks jawaban).
    // Tanpa flag ini, respons tetap JSON seperti sebelumnya.
    if (body.stream === true) {
      return streamChatResponse({
        message, user, userId, existingChat, mode, preferences, attack, questionType,
        quota: { used: chatsTodayCount, limit: dailyLimit },
      });
    }

    if (attack.block) {
      console.warn("[AI-SECURITY] Permintaan informasi internal diblok:", attack.reason);
      return NextResponse.json({ answer: BLOCKED_REQUEST_MESSAGE, chatId: existingChat?.id ?? null, blocked: true });
    }

    const { matches } = await retrieveDocuments(message);
    const evidence = assessEvidence(matches);
    const { boundary, canary } = createRequestSecrets();
    const promptMessages = [
      new SystemMessage(buildSystemPrompt({
        preferences, boundary, canary, questionType, evidence,
        attackFlags: attack.flags, hasPersonalContext: !!user.personalContext,
      })),
      new HumanMessage(buildUserContent({ matches, personalContext: user.personalContext, message, boundary })),
    ];

    // Mode JSON: hanya model Gemini (tanpa streaming), urutan sesuai prioritas, dengan cadangan
    await syncCooldowns(prisma);
    const chain = buildModelChain(mode).filter((c) => c.provider === "gemini");
    let response;
    let used;
    let lastError;
    for (const c of chain) {
      try {
        response = await createLlm(c.model).invoke(promptMessages);
        const text = typeof response.content === "string" ? response.content : contentParts(response.content).filter((p) => p.type === "text").map((p) => p.text).join("");
        if (!text.trim()) throw Object.assign(new Error(`Model ${c.model} selesai tanpa teks jawaban`), { emptyResponse: true });
        used = c;
        break;
      } catch (llmError) {
        const info = classifyModelError(llmError, { provider: c.provider });
        console.error(`LLM Error (${c.model}) [${cooldownReasonOf(info)}]:`, llmError?.message);
        coolDown(c, info);
        lastError = info;
        if (!info.fallback) break;
      }
    }
    if (!used) {
      if (lastError?.kind === "limit") {
        return NextResponse.json({ error: QUOTA_ERROR_MESSAGE }, { status: 429 });
      }
      throw new Error("Semua model gagal menjawab");
    }

    const usageInfo = {
      model: used.model, mode: used.mode,
      inputTokens: response.usage_metadata?.input_tokens, outputTokens: response.usage_metadata?.output_tokens,
    };
    let answer = typeof response.content === "string" ? response.content : contentParts(response.content).filter((p) => p.type === "text").map((p) => p.text).join("");

    if (scanOutput(answer, { canary, fingerprints: PROMPT_FINGERPRINTS, secrets: secretEnvValues() })) {
      console.warn("[AI-SECURITY] Jawaban diblok (mode JSON)");
      await recordUsage(userId, usageInfo);
      return NextResponse.json({ answer: BLOCKED_OUTPUT_MESSAGE, chatId: existingChat?.id ?? null, blocked: true });
    }
    answer += guardrailNotes(answer, { questionType, docTitles: docTitlesOf(matches) }).text;

    // ==========================================================
    // 4. Rekam Jejak ke Database (Setelah AI sukses menjawab)
    // ==========================================================
    const chatSession = await saveExchange({ existingChat, userId, message, answer, usage: usageInfo });

    if (!chatSession) {
       return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
    }

    // 5. Kembalikan respons ke Frontend
    return NextResponse.json({ answer, chatId: chatSession.id, quota: quotaStatus(chatsTodayCount + 1, dailyLimit) });

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
