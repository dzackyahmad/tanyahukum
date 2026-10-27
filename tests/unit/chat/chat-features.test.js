import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: fitur chat tambahan
// - Tombol Stop (stream dibatalkan → AI berhenti, tidak ada yang disimpan)
// - Mode Groq (GPT-OSS / Qwen): konteks dibatasi, penalaran ditampilkan, fallback ke Gemini
// - DELETE /api/chat/history (hapus semua riwayat, konfirmasi wajib)
// ─────────────────────────────────────────────────────────────────────────────

const chatRoute = '@/app/api/chat/route.js';
const SESSION = { userId: 'u1', email: 'u1@test.com', role: 'USER' };

const matchesN = (n) =>
  Array.from({ length: n }, (_, i) => ({
    metadata: {
      title: `Regulasi Ketenagakerjaan - PERDA ${i + 1}`,
      page: '1-25',
      text: `Pasal ${i + 1} ayat (1) Setiap pengusaha wajib memenuhi hak pekerja sesuai ketentuan peraturan yang berlaku nomor ${i + 1}.`,
    },
  }));

function mockRag({ geminiChunks = ['Jawaban Gemini.'], geminiDelayMs = 0, matches = matchesN(3) } = {}) {
  global.__llmCalls = [];
  jest.doMock('@pinecone-database/pinecone', () => ({
    Pinecone: class { Index() { return { query: jest.fn().mockResolvedValue({ matches }) }; } },
  }));
  jest.doMock('@langchain/community/embeddings/voyage', () => ({
    VoyageEmbeddings: class { async embedQuery() { return [0.1]; } },
  }));
  jest.doMock('@langchain/google-genai', () => ({
    ChatGoogleGenerativeAI: class {
      constructor(opts) { this.opts = opts; global.__llmCalls.push(opts); }
      async stream(_msgs, options = {}) {
        return (async function* () {
          for (const c of geminiChunks) {
            if (geminiDelayMs) await new Promise((r) => setTimeout(r, geminiDelayMs));
            if (options.signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
            yield { content: c };
          }
        })();
      }
    },
  }));
  jest.doMock('@langchain/core/messages', () => ({
    HumanMessage: class { constructor(c) { this.content = c; } },
    SystemMessage: class { constructor(c) { this.content = c; } },
  }));
}

const prismaFor = () => ({
  user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
  chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
  chat: { create: jest.fn().mockResolvedValue({ id: 'chat-x' }), update: jest.fn().mockResolvedValue({}) },
});

const parseEvents = async (res) => (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));

// SSE Groq tiruan (format OpenAI-compatible)
function groqSse(deltas) {
  const body = deltas.map((d) => `data: ${JSON.stringify({ choices: [{ delta: d }] })}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('Tombol Stop (pembatalan stream)', () => {
  test('TC-STOP-01: stream dibatalkan klien → AI berhenti & tidak ada riwayat yang disimpan', async () => {
    // Potongan cukup panjang agar lolos penahanan ±96 karakter penjaga output dan langsung terkirim
    const pad = ' Isi pasal yang menjelaskan hak dan kewajiban pekerja secara rinci.'.repeat(2);
    mockRag({ geminiChunks: [`Bagian 1.${pad}`, `Bagian 2.${pad}`, `Bagian 3.${pad}`, `Bagian 4.${pad}`], geminiDelayMs: 40 });
    const prismaMock = prismaFor();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock, authSession: SESSION });

    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes stop', stream: true, mode: 'fast' } }));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let seen = '';
    while (!seen.includes('"type":"text"')) {
      const { value, done } = await reader.read();
      if (done) break;
      seen += dec.decode(value);
    }
    await reader.cancel(); // = pengguna menekan Stop
    await new Promise((r) => setTimeout(r, 200));

    expect(seen).toContain('Bagian 1.');
    expect(seen).not.toContain('Bagian 4.');
    expect(prismaMock.chatHistory.create).not.toHaveBeenCalled();
    expect(prismaMock.chat.create).not.toHaveBeenCalled();
  });
});

describe('Mode Groq', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.GROQ_API_KEY;
  });

  test('TC-GROQ-01: GPT-OSS → konteks dibatasi 20 potongan, penalaran tampil sebagai thinking, jawaban tersimpan', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockRag({ matches: matchesN(30) });
    let groqBody = null;
    global.fetch = jest.fn(async (url, init) => {
      groqBody = JSON.parse(init.body);
      return groqSse([{ reasoning: 'Menimbang pasal...' }, { content: 'PKWT paling lama ' }, { content: '5 tahun.' }]);
    });
    const prismaMock = prismaFor();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock, authSession: SESSION });
    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Batas PKWT?', stream: true, mode: 'gptoss' } })));

    expect(groqBody.model).toBe('openai/gpt-oss-120b');
    // Dokumen dikirim di pesan pengguna (blok data), bukan di prompt sistem
    const [systemMsg, userMsg] = groqBody.messages;
    expect(systemMsg.role).toBe('system');
    expect(systemMsg.content).not.toContain('PERDA 1 |');
    expect(userMsg.content).toContain('PERDA 20 |');      // potongan ke-20 ikut
    expect(userMsg.content).not.toContain('PERDA 21 |');  // potongan ke-21 tidak (batas Groq)
    expect(events.find((e) => e.type === 'model')).toMatchObject({ provider: 'groq', contextChunks: 20, fallback: false });
    expect(events.filter((e) => e.type === 'thinking').map((e) => e.text).join('')).toBe('Menimbang pasal...');
    expect(events.at(-1)).toMatchObject({ type: 'done', model: 'openai/gpt-oss-120b', answer: 'PKWT paling lama 5 tahun.' });
    expect(prismaMock.chatHistory.create).toHaveBeenCalledTimes(2);
  });

  test('TC-GROQ-02: batas token Groq terlampaui (413) → otomatis pindah ke Gemini', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockRag({ geminiChunks: ['Jawaban dari Gemini.'] });
    global.fetch = jest.fn(async () => new Response('{"error":"Request too large"}', { status: 413 }));
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    const { buildModelChain } = await import('@/lib/modelRouter');
    const backup = buildModelChain('qwen', { env: { GROQ_API_KEY: 'x' } }).find((c) => c.provider === 'gemini'); // cadangan Gemini pertama (urutan Ragas)
    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'qwen' } })));

    const models = events.filter((e) => e.type === 'model').map((e) => [e.provider, e.model, e.fallback]);
    expect(models[0]).toEqual(['groq', 'qwen/qwen3.8-27b', false]);
    expect(models.find((m) => m[0] === 'gemini')).toEqual(['gemini', backup.model, true]);
    expect(events.at(-1)).toMatchObject({ type: 'done', answer: 'Jawaban dari Gemini.' });
  });

  test('TC-GROQ-03: GROQ_API_KEY tidak diset → mode Groq langsung memakai Gemini (tidak memanggil Groq)', async () => {
    mockRag({ geminiChunks: ['Jawaban Gemini.'] });
    global.fetch = jest.fn();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'gptoss' } })));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(events.find((e) => e.type === 'model')).toMatchObject({ provider: 'gemini' });
    expect(events.at(-1).type).toBe('done');
  });

  test('TC-GROQ-04: mode Kilat & Gemini 3.5 Flash memakai model yang benar', async () => {
    mockRag();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'A', stream: true, mode: 'lite' } })));
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'B', stream: true, mode: 'next' } })));
    expect(global.__llmCalls[0]).toMatchObject({ model: 'gemini-3.5-flash-lite' });
    expect(global.__llmCalls[0].thinkingConfig).toBeUndefined();
    expect(global.__llmCalls[1]).toMatchObject({ model: 'gemini-3.5-flash', thinkingConfig: { includeThoughts: true } });
  });
});

describe('DELETE /api/chat/history', () => {
  const historyRoute = '@/app/api/chat/history/route.js';

  test('TC-DELALL-01: tanpa login → 401', async () => {
    const prismaMock = { chat: { deleteMany: jest.fn() } };
    const { DELETE } = await loadRouteWithMocks(historyRoute, { prismaMock, authSession: null });
    const res = await DELETE(makeMockRequest({ method: 'DELETE', jsonBody: { confirm: 'HAPUS' } }));
    expect(res.status).toBe(401);
    expect(prismaMock.chat.deleteMany).not.toHaveBeenCalled();
  });

  test('TC-DELALL-02: tanpa konfirmasi "HAPUS" → 400, tidak ada yang dihapus', async () => {
    const prismaMock = { chat: { deleteMany: jest.fn() } };
    const { DELETE } = await loadRouteWithMocks(historyRoute, { prismaMock, authSession: SESSION });
    const res = await DELETE(makeMockRequest({ method: 'DELETE', jsonBody: { confirm: 'hapus dong' } }));
    expect(res.status).toBe(400);
    expect(prismaMock.chat.deleteMany).not.toHaveBeenCalled();
  });

  test('TC-DELALL-03: [SECURITY] hanya menghapus chat milik user yang login', async () => {
    const prismaMock = { chat: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) } };
    const { DELETE } = await loadRouteWithMocks(historyRoute, { prismaMock, authSession: SESSION });
    const res = await DELETE(makeMockRequest({ method: 'DELETE', jsonBody: { confirm: 'HAPUS', userId: 'korban' } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, deletedChats: 4 });
    expect(prismaMock.chat.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});

describe('Mode Kilat / Berpikir per model', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.GROQ_API_KEY;
  });

  const runGroq = async (mode, deltas) => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    mockRag();
    let body = null;
    global.fetch = jest.fn(async (_url, init) => {
      body = JSON.parse(init.body);
      return groqSse(deltas);
    });
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode } })));
    return { body, events };
  };

  test('TC-MODE-01: Qwen Berpikir → reasoning_effort medium, penalaran dipisah & ditampilkan', async () => {
    const { body, events } = await runGroq('qwen-think', [{ reasoning: 'Menimbang...' }, { content: 'Jawaban.' }]);
    expect(body).toMatchObject({ model: 'qwen/qwen3.8-27b', reasoning_effort: 'medium', reasoning_format: 'parsed' });
    expect(events.filter((e) => e.type === 'thinking').map((e) => e.text).join('')).toBe('Menimbang...');
  });

  test('TC-MODE-02: Qwen Kilat → reasoning_effort none', async () => {
    const { body } = await runGroq('qwen', [{ content: 'Jawaban.' }]);
    expect(body).toMatchObject({ model: 'qwen/qwen3.8-27b', reasoning_effort: 'none' });
  });

  test('TC-MODE-03: GPT-OSS Kilat → effort low, penalaran singkat tidak ditampilkan', async () => {
    const { body, events } = await runGroq('gptoss-fast', [{ reasoning: 'singkat' }, { content: 'Jawaban.' }]);
    expect(body).toMatchObject({ model: 'openai/gpt-oss-120b', reasoning_effort: 'low' });
    expect(events.some((e) => e.type === 'thinking')).toBe(false);
    expect(events.at(-1)).toMatchObject({ type: 'done', answer: 'Jawaban.' });
  });

  test('TC-MODE-04: Flash-Lite Berpikir & 3.5 Flash Kilat memakai konfigurasi thinking yang benar', async () => {
    mockRag();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'A', stream: true, mode: 'lite-think' } })));
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'B', stream: true, mode: 'next-fast' } })));
    expect(global.__llmCalls[0]).toMatchObject({ model: 'gemini-3.5-flash-lite', thinkingConfig: { includeThoughts: true, thinkingBudget: 1024 } });
    expect(global.__llmCalls[1]).toMatchObject({ model: 'gemini-3.5-flash', thinkingConfig: { thinkingLevel: 'low' } });
  });

  test('TC-MODE-05: Gemini tanpa retry otomatis (maxRetries 0) agar fallback langsung jalan', async () => {
    mockRag();
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'A', stream: true, mode: 'lite' } })));
    expect(global.__llmCalls[0].maxRetries).toBe(0);
  });
});

describe('Fallback saat server model sibuk', () => {
  test('TC-FALLBACK-01: stream Gemini gagal dibaca (gangguan sementara) sebelum menulis → pindah ke model cadangan', async () => {
    global.__llmCalls = [];
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class { Index() { return { query: jest.fn().mockResolvedValue({ matches: matchesN(3) }) }; } },
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class { async embedQuery() { return [0.1]; } },
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class {
        constructor(opts) { this.opts = opts; global.__llmCalls.push(opts); }
        async stream() {
          if (this.opts.model === 'gemini-3.6-flash') {
            throw new Error('[GoogleGenerativeAI Error]: Failed to parse stream');
          }
          return (async function* () { yield { content: 'Jawaban cadangan.' }; })();
        }
      },
    }));
    jest.doMock('@langchain/core/messages', () => ({
      HumanMessage: class { constructor(c) { this.content = c; } },
      SystemMessage: class { constructor(c) { this.content = c; } },
    }));
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock: prismaFor(), authSession: SESSION });
    // Dibaca sebelum request: setelah gagal, 3.6 Flash masuk cooldown dan urutannya bergeser
    const { buildModelChain } = await import('@/lib/modelRouter');
    const backup = buildModelChain('fast', { env: {} })[1]; // cadangan berikutnya sesuai urutan Ragas
    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'fast' } })));
    expect(events.filter((e) => e.type === 'model').map((e) => [e.model, e.fallback])).toEqual([
      ['gemini-3.6-flash', false],
      [backup.model, true],
    ]);
    expect(events.at(-1)).toMatchObject({ type: 'done', answer: 'Jawaban cadangan.' });
  });
});

describe('Kuota harian (PromptUsage)', () => {
  const quotaPrisma = (used) => ({
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'FREE', promptLimit: 10, personalContext: null }) },
    promptUsage: { count: jest.fn().mockResolvedValue(used), create: jest.fn().mockResolvedValue({}) },
    chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
    chat: { create: jest.fn().mockResolvedValue({ id: 'chat-x' }), update: jest.fn().mockResolvedValue({}) },
  });

  test('TC-QUOTA-01: [SECURITY] kuota dihitung dari PromptUsage → hapus riwayat tidak mengembalikan kuota', async () => {
    mockRag();
    const prismaMock = quotaPrisma(10); // riwayat chat sudah dihapus, tetapi pemakaian hari ini tetap 10
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock, authSession: SESSION });
    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'lite' } }));
    expect(res.status).toBe(403);
    expect(prismaMock.promptUsage.count).toHaveBeenCalledWith({ where: { userId: 'u1', createdAt: { gte: expect.any(Date) } } });
    expect(global.__llmCalls).toHaveLength(0);
  });

  test('TC-QUOTA-02: jawaban selesai → pemakaian kuota dicatat', async () => {
    mockRag();
    const prismaMock = quotaPrisma(0);
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock, authSession: SESSION });
    await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'lite' } })));
    // Pemakaian dicatat beserta model & mode yang benar-benar menjawab (halaman Penggunaan)
    expect(prismaMock.promptUsage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'u1', model: expect.any(String), mode: expect.any(String) }) });
  });

  test('TC-QUOTA-03: Stop setelah AI menulis → kuota tetap terpakai, riwayat tidak disimpan', async () => {
    // Potongan cukup panjang agar lolos penahanan ±96 karakter penjaga output dan langsung terkirim
    const pad = ' Isi pasal yang menjelaskan hak dan kewajiban pekerja secara rinci.'.repeat(2);
    mockRag({ geminiChunks: [`Bagian 1.${pad}`, `Bagian 2.${pad}`, `Bagian 3.${pad}`, `Bagian 4.${pad}`], geminiDelayMs: 40 });
    const prismaMock = quotaPrisma(0);
    const { POST } = await loadRouteWithMocks(chatRoute, { prismaMock, authSession: SESSION });
    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true, mode: 'fast' } }));
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let seen = '';
    while (!seen.includes('"type":"text"')) {
      const { value, done } = await reader.read();
      if (done) break;
      seen += dec.decode(value);
    }
    await reader.cancel();
    await new Promise((r) => setTimeout(r, 200));
    expect(prismaMock.promptUsage.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.chatHistory.create).not.toHaveBeenCalled();
  });
});
