import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const MAX_MESSAGE_LENGTH = 5000;

// 1. Import Prisma Client
import prisma from "@/lib/prisma";

// ==========================================================
// HELPER RAG (dipakai bersama oleh mode JSON & mode streaming)
// ==========================================================

const QUOTA_ERROR_MESSAGE = "Kuota AI hari ini telah habis. Silakan coba lagi nanti.";
const GENERIC_ERROR_MESSAGE = "Terjadi kesalahan pada server saat memproses pertanyaan hukum.";

function isQuotaError(err) {
  return err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota");
}

function createLlm(extra = {}) {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    temperature: 0.2,
    ...extra,
  });
}

// Ubah pertanyaan jadi vektor (Voyage) lalu cari potongan dokumen relevan (Pinecone)
async function retrieveDocuments(message) {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.Index(process.env.PINECONE_INDEX_V2);

  const embeddings = new VoyageEmbeddings({
    apiKey: process.env.VOYAGEAI_API_KEY,
    inputType: "query",
    modelName: "voyage-law-2",
  });

  const queryVector = await embeddings.embedQuery(message);
  const queryResponse = await index.query({
    vector: queryVector,
    topK: 50,
    includeMetadata: true,
  });

  const matches = queryResponse.matches || [];
  // [PERBAIKAN 3]: Format konteks dokumen diperjelas biar AI gampang bacanya
  const context = matches
    // Tanpa nomor urut ("DOKUMEN 1") agar AI mengutip nama dokumen, bukan nomornya.
    // Nama dokumen harus utuh supaya referensi di frontend bisa dicocokkan & dibuka.
    .map((m) => `[Sumber: ${m.metadata?.title|| 'Tidak diketahui'} | Hal: ${m.metadata?.page || '?'}]\n${m.metadata?.text || ''}`)
    .join("\n\n---\n\n");

  return { matches, context };
}

function buildSystemPrompt(context, user) {
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
4. GAYA BAHASA: Gunakan bahasa Indonesia yang baku namun mudah dipahami. Jangan bertele-tele dan jangan menggunakan salam pembuka yang berlebihan.`;
}

// Simpan pertanyaan & jawaban ke riwayat (dibuat SETELAH AI sukses menjawab)
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

function streamChatResponse({ message, user, userId, existingChat }) {
  const encoder = new TextEncoder();
  const startedAt = Date.now();

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
        const { matches, context } = await retrieveDocuments(message);
        const { uniqueCount, docs } = summarizeSources(matches);
        send({ type: "sources", count: matches.length, uniqueCount, docs });
        send({ type: "step", step: "search", state: "done" });

        // 2. AI berpikir & menulis (ringkasan thinking Gemini ikut dikirim)
        send({ type: "step", step: "think", state: "active" });
        const llm = createLlm({ thinkingConfig: { includeThoughts: true } });

        let answer = "";
        let writing = false;
        try {
          const chunks = await llm.stream([
            new SystemMessage(buildSystemPrompt(context, user)),
            new HumanMessage(message),
          ]);
          for await (const chunk of chunks) {
            for (const part of contentParts(chunk.content)) {
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
          }
        } catch (llmError) {
          console.error("LLM Stream Error:", llmError);
          if (isQuotaError(llmError)) {
            send({ type: "error", error: QUOTA_ERROR_MESSAGE });
            return;
          }
          throw llmError;
        }

        if (!answer.trim()) throw new Error("Jawaban AI kosong");

        // 3. Simpan ke riwayat (sama seperti mode JSON)
        const chatSession = await saveExchange({ existingChat, userId, message, answer });
        if (!chatSession) {
          send({ type: "error", error: "Sesi chat tidak ditemukan" });
          return;
        }

        send({ type: "step", step: "write", state: "done" });
        send({ type: "done", chatId: chatSession.id, answer, durationMs: Date.now() - startedAt });
      } catch (error) {
        console.error("API Chat Stream Error:", error);
        send({ type: "error", error: GENERIC_ERROR_MESSAGE });
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch {}
        }
      }
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

    // Pastikan chatId (jika ada) benar-benar milik user ini SEBELUM memanggil AI
    let existingChat = null;
    if (chatId) {
      if (typeof chatId !== "string") {
        return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
      }
      existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!existingChat || existingChat.userId !== userId) {
        return NextResponse.json({ error: "Sesi chat tidak ditemukan" }, { status: 404 });
      }
    }

    // Cari data user di database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak terdaftar." }, { status: 404 });
    }

    // Hitung jumlah chat user HARI INI
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0); // Set waktu ke 00:00:00 hari ini

    const chatsTodayCount = await prisma.chatHistory.count({
      where: {
        userId: userId,
        role: "USER", // Hanya hitung pertanyaan dari user
        createdAt: {
          gte: startOfDay, // Lebih besar atau sama dengan awal hari ini
        }
      }
    });

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
      return streamChatResponse({ message, user, userId, existingChat });
    }

    const { context } = await retrieveDocuments(message);
    const llm = createLlm();

    let response;
    try {
      response = await llm.invoke([
        new SystemMessage(buildSystemPrompt(context, user)),
        new HumanMessage(message),
      ]);
    } catch (llmError) {
      console.error("LLM Error:", llmError);
      if (isQuotaError(llmError)) {
        return NextResponse.json(
          { error: QUOTA_ERROR_MESSAGE },
          { status: 429 }
        );
      }
      throw llmError;
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