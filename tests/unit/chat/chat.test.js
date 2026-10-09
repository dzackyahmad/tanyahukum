import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: /api/chat (POST, GET, PATCH, DELETE)
// ─────────────────────────────────────────────────────────────────────────────

const baseRoute = '@/app/api/chat/route.js';

// Sesi default untuk test yang butuh user login
const SESSION_PRO  = { userId: 'u-pro',  email: 'pro@test.com',  role: 'USER' };
const SESSION_FREE = { userId: 'u-free', email: 'free@test.com', role: 'USER' };
const SESSION_U1   = { userId: 'u1',     email: 'u1@test.com',   role: 'USER' };

function mockExternalServices() {
  jest.doMock('@pinecone-database/pinecone', () => ({
    Pinecone: class {
      Index() { return { query: jest.fn().mockResolvedValue({ matches: [] }) }; }
    },
  }));
  jest.doMock('@langchain/community/embeddings/voyage', () => ({
    VoyageEmbeddings: class { async embedQuery() { return new Array(1024).fill(0.1); } },
  }));
  jest.doMock('@langchain/google-genai', () => ({
    ChatGoogleGenerativeAI: class {
      async invoke() { return { content: 'Berdasarkan database hukum, berikut jawabannya...' }; }
    },
  }));
  jest.doMock('@langchain/core/messages', () => ({
    HumanMessage: class { constructor(c) { this.content = c; } },
    SystemMessage: class { constructor(c) { this.content = c; } },
  }));
}

describe('POST /api/chat', () => {
  // ── HAPPY PATH ────────────────────────────────────────────────────────────
  test('TC-CHAT-01: returns AI answer for valid PRO user request', async () => {
    mockExternalServices();
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-pro', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      chat: { create: jest.fn().mockResolvedValue({ id: 'chat-1' }), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    };
    process.env.PINECONE_API_KEY = 'fake';
    process.env.PINECONE_INDEX_V2 = 'fake';
    process.env.VOYAGEAI_API_KEY = 'fake';
    process.env.GOOGLE_API_KEY = 'fake';

    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_PRO });
    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Apa itu UU Ketenagakerjaan?' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBeDefined();
    expect(body.chatId).toBe('chat-1');
  });

  // ── AUTH GATE (FIXED: userId dari JWT, bukan body) ────────────────────────
  test('TC-CHAT-02: returns 400 when message is empty string', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, chatHistory: { count: jest.fn() }, chat: { create: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: '' } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('TC-CHAT-03: returns 401 when no JWT session (not logged in)', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, chatHistory: { count: jest.fn() }, chat: { create: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Test tanpa login' } });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('TC-CHAT-04: returns 404 when userId from session does not exist in DB', async () => {
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(null) }, chatHistory: { count: jest.fn() }, chat: { create: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Test' } });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  // ── PROMPT LIMIT (FREE TIER) ──────────────────────────────────────────────
  test('TC-CHAT-05: returns 403 with limitReached flag when FREE user exceeds daily limit', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-free', tier: 'FREE', promptLimit: 5, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(5) },
      chat: { create: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_FREE });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Pertanyaan ke-6' } });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.limitReached).toBe(true);
  });

  test('TC-CHAT-06: PRO user bypasses prompt limit check', async () => {
    mockExternalServices();
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-pro', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(9999), create: jest.fn().mockResolvedValue({}) },
      chat: { create: jest.fn().mockResolvedValue({ id: 'c1' }), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_PRO });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Pertanyaan PRO' } });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });

  test('TC-CHAT-07: uses existing chatId when provided', async () => {
    mockExternalServices();
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      chat: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 'existing-chat-id', userId: 'u1' }), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Lanjutan', chatId: 'existing-chat-id' } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prismaMock.chat.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat — ownership chatId', () => {
  test('TC-CHAT-20: [SECURITY] POST ke chatId milik user lain ditolak 404 sebelum AI dipanggil', async () => {
    const invoke = jest.fn();
    mockExternalServices();
    jest.doMock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: class { invoke(...a) { return invoke(...a); } } }));
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      chat: { create: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 'victim-chat', userId: 'victim-id' }), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'Sisipan', chatId: 'victim-chat' } });
    const res = await POST(req);
    expect(res.status).toBe(404);
    expect(invoke).not.toHaveBeenCalled();
    expect(prismaMock.chatHistory.create).not.toHaveBeenCalled();
  });

  test('TC-CHAT-21: pesan melebihi 5000 karakter ditolak 400', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, chatHistory: { count: jest.fn() }, chat: { create: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });
    const req = makeMockRequest({ method: 'POST', jsonBody: { message: 'A'.repeat(5001) } });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat — urutan riwayat', () => {
  test('TC-CHAT-23: jawaban AI selalu tersimpan setelah pertanyaan user (createdAt lebih besar)', async () => {
    mockExternalServices();
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      chat: { create: jest.fn().mockResolvedValue({ id: 'c1' }), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });
    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tanya urutan' } }));
    expect(res.status).toBe(200);

    const byRole = Object.fromEntries(prismaMock.chatHistory.create.mock.calls.map(([a]) => [a.data.role, a.data.createdAt]));
    expect(byRole.AI.getTime()).toBeGreaterThan(byRole.USER.getTime());
  });

  test('TC-CHAT-24: riwayat diurutkan createdAt lalu role (USER sebelum AI jika timestamp kembar)', async () => {
    const prismaMock = { chatHistory: { findMany: jest.fn().mockResolvedValue([]) }, chat: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });
    await GET(makeMockRequest({ url: 'http://localhost/api/chat?userId=u1&chatId=c1' }));
    expect(prismaMock.chatHistory.findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'asc' }, { role: 'asc' }]);
  });
});

describe('GET /api/chat — ownership chatId', () => {
  test('TC-CHAT-22: [SECURITY] GET pesan selalu di-scope ke userId sesi (tidak bisa baca chat orang lain)', async () => {
    const prismaMock = { chatHistory: { findMany: jest.fn().mockResolvedValue([]) }, chat: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });
    const req = makeMockRequest({ url: 'http://localhost/api/chat?userId=u1&chatId=victim-chat' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(prismaMock.chatHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chatId: 'victim-chat', userId: 'u1' } })
    );
  });
});

describe('GET /api/chat', () => {
  // ── FIXED: IDOR sudah ditutup dengan validasi session ────────────────────
  test('TC-CHAT-08: [FIXED] GET tanpa JWT sekarang ditolak 401 (IDOR sudah ditutup)', async () => {
    const prismaMock = { chat: { findMany: jest.fn() }, chatHistory: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?userId=victim-user&type=list' });
    const res = await GET(req);
    // Sebelum fix: 200 (IDOR). Setelah fix: 401 ✅
    expect(res.status).toBe(401);
    expect(prismaMock.chat.findMany).not.toHaveBeenCalled();
  });

  test('TC-CHAT-09: returns 401 when userId param tidak cocok dengan session', async () => {
    const prismaMock = { chat: { findMany: jest.fn() }, chatHistory: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u-attacker' } });

    // Attacker coba akses chat milik victim
    const req = makeMockRequest({ url: 'http://localhost/api/chat?userId=victim-user&type=list' });
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(prismaMock.chat.findMany).not.toHaveBeenCalled();
  });

  test('TC-CHAT-10: returns chat list when userId cocok dengan session', async () => {
    const chats = [{ id: 'C1', userId: 'u1', title: 'Chat saya', updatedAt: new Date() }];
    const prismaMock = { chat: { findMany: jest.fn().mockResolvedValue(chats) }, chatHistory: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?userId=u1&type=list' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chats).toHaveLength(1);
  });

  test('TC-CHAT-11: returns messages for specific chatId', async () => {
    const messages = [
      { id: 'm1', role: 'USER', content: 'Tanya', createdAt: new Date() },
      { id: 'm2', role: 'AI', content: 'Jawab', createdAt: new Date() },
    ];
    const prismaMock = { chatHistory: { findMany: jest.fn().mockResolvedValue(messages) }, chat: { findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?userId=u1&chatId=C1' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.history).toHaveLength(2);
  });
});

describe('PATCH /api/chat', () => {
  test('TC-CHAT-12: renames a chat successfully (user owns the chat)', async () => {
    const prismaMock = {
      chat: {
        findUnique: jest.fn().mockResolvedValue({ id: 'C1', userId: 'u1' }),
        update: jest.fn().mockResolvedValue({ id: 'C1', title: 'New Title' }),
      },
    };
    const { PATCH } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'PATCH', jsonBody: { chatId: 'C1', title: 'New Title' } });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('TC-CHAT-13: returns 400 when chatId atau title tidak ada', async () => {
    const prismaMock = { chat: { findUnique: jest.fn(), update: jest.fn() } };
    const { PATCH } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'PATCH', jsonBody: { chatId: 'C1' } });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  test('TC-CHAT-14: [FIXED] PATCH tanpa login sekarang ditolak 401', async () => {
    const prismaMock = { chat: { findUnique: jest.fn(), update: jest.fn() } };
    const { PATCH } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ method: 'PATCH', jsonBody: { chatId: 'victim-chat', title: 'Hack' } });
    const res = await PATCH(req);
    // Sebelum fix: 200 (bug). Setelah fix: 401 ✅
    expect(res.status).toBe(401);
    expect(prismaMock.chat.update).not.toHaveBeenCalled();
  });

  test('TC-CHAT-15: [FIXED] PATCH ditolak 403 jika chat bukan milik user', async () => {
    const prismaMock = {
      chat: {
        findUnique: jest.fn().mockResolvedValue({ id: 'victim-chat', userId: 'victim-id' }),
        update: jest.fn(),
      },
    };
    const { PATCH } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'attacker-id' } });

    const req = makeMockRequest({ method: 'PATCH', jsonBody: { chatId: 'victim-chat', title: 'Hack' } });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    expect(prismaMock.chat.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/chat', () => {
  test('TC-CHAT-16: deletes a chat successfully (user owns chat)', async () => {
    const prismaMock = {
      chat: {
        findUnique: jest.fn().mockResolvedValue({ id: 'C1', userId: 'u1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const { DELETE } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?chatId=C1' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });

  test('TC-CHAT-17: returns 400 when chatId tidak ada', async () => {
    const prismaMock = { chat: { findUnique: jest.fn(), delete: jest.fn() } };
    const { DELETE } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ url: 'http://localhost/api/chat' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  test('TC-CHAT-18: [FIXED] DELETE tanpa login sekarang ditolak 401', async () => {
    const prismaMock = { chat: { findUnique: jest.fn(), delete: jest.fn() } };
    const { DELETE } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?chatId=victim-chat' });
    const res = await DELETE(req);
    // Sebelum fix: 200 (bug). Setelah fix: 401 ✅
    expect(res.status).toBe(401);
    expect(prismaMock.chat.delete).not.toHaveBeenCalled();
  });

  test('TC-CHAT-19: [FIXED] DELETE ditolak 403 jika chat bukan milik user', async () => {
    const prismaMock = {
      chat: {
        findUnique: jest.fn().mockResolvedValue({ id: 'victim-chat', userId: 'victim-id' }),
        delete: jest.fn(),
      },
    };
    const { DELETE } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'attacker-id' } });

    const req = makeMockRequest({ url: 'http://localhost/api/chat?chatId=victim-chat' });
    const res = await DELETE(req);
    expect(res.status).toBe(403);
    expect(prismaMock.chat.delete).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mode streaming (transparansi proses): POST /api/chat dengan { stream: true }
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/chat — mode streaming', () => {
  const parseEvents = async (res) =>
    (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l));

  function mockStreamingServices({ chunks, streamError } = {}) {
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class {
        Index() {
          return {
            query: jest.fn().mockResolvedValue({
              matches: [
                { metadata: { title: 'Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023', page: '1-25', text: 'Pasal 19 ...' } },
                { metadata: { title: 'Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023', page: '26-50', text: 'Pasal 20 ...' } },
                { metadata: { title: 'Regulasi Ketenagakerjaan - 2023pd3332009', page: '26-50', text: 'Pasal 39 ...' } },
              ],
            }),
          };
        }
      },
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class { async embedQuery() { return [0.1]; } },
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class {
        constructor(opts) { this.opts = opts; }
        async stream() {
          if (streamError) throw streamError;
          return (async function* () { for (const c of chunks) yield { content: c }; })();
        }
      },
    }));
    jest.doMock('@langchain/core/messages', () => ({
      HumanMessage: class { constructor(c) { this.content = c; } },
      SystemMessage: class { constructor(c) { this.content = c; } },
    }));
  }

  const prismaFor = (tier = 'PRO') => ({
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier, promptLimit: 5, personalContext: null }) },
    chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
    chat: { create: jest.fn().mockResolvedValue({ id: 'chat-stream' }), update: jest.fn().mockResolvedValue({}) },
  });

  test('TC-CHAT-25: mengirim tahap proses, dokumen, thinking, teks, lalu done — dan menyimpan jawaban utuh', async () => {
    mockStreamingServices({
      chunks: [
        [{ type: 'thinking', thinking: 'Menganalisis pasal PKWT...' }],
        'PKWT paling lama ',
        [{ type: 'text', text: '5 tahun.' }],
      ],
    });
    const prismaMock = prismaFor();
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Batas PKWT?', stream: true } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('ndjson');

    const events = await parseEvents(res);
    const types = events.map((e) => (e.type === 'step' ? `${e.step}:${e.state}` : e.type));
    expect(types).toEqual([
      'search:active', 'sources', 'search:done',
      'think:active', 'thinking', 'think:done', 'write:active',
      'text', 'text', 'write:done', 'done',
    ]);

    const sources = events.find((e) => e.type === 'sources');
    expect(sources.count).toBe(3);
    expect(sources.uniqueCount).toBe(2); // dokumen unik, bukan potongan
    expect(sources.docs[0]).toEqual({ title: 'Regulasi Ketenagakerjaan - PERDA No 06 Tahun 2023', page: '1-25' });

    const done = events.at(-1);
    expect(done.answer).toBe('PKWT paling lama 5 tahun.');
    expect(done.chatId).toBe('chat-stream');

    // Riwayat tersimpan sama seperti mode JSON (thinking TIDAK ikut disimpan)
    const aiSave = prismaMock.chatHistory.create.mock.calls.find(([a]) => a.data.role === 'AI')[0];
    expect(aiSave.data.content).toBe('PKWT paling lama 5 tahun.');
  });

  test('TC-CHAT-26: kuota Gemini habis saat streaming → event error, riwayat tidak disimpan', async () => {
    mockStreamingServices({ streamError: Object.assign(new Error('quota exceeded'), { status: 429 }) });
    const prismaMock = prismaFor();
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const events = await parseEvents(await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true } })));
    expect(events.at(-1)).toEqual({ type: 'error', error: expect.stringMatching(/kuota/i) });
    expect(prismaMock.chatHistory.create).not.toHaveBeenCalled();
  });

  test('TC-CHAT-27: batas kuota harian tetap berlaku di mode streaming (403 JSON sebelum stream dimulai)', async () => {
    mockStreamingServices({ chunks: ['x'] });
    const prismaMock = prismaFor('FREE');
    prismaMock.chatHistory.count.mockResolvedValue(5);
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: SESSION_U1 });

    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: 'Tes', stream: true } }));
    expect(res.status).toBe(403);
    expect((await res.json()).limitReached).toBe(true);
  });
});
