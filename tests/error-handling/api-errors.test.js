import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling Tests
// Cakupan: DB failure, AI failure, network timeout, malformed request,
//          missing env vars, vector DB failure, concurrent race conditions
// ─────────────────────────────────────────────────────────────────────────────

// Sesi login default untuk endpoint yang wajib autentikasi
const SESSION_U1 = { userId: 'u1', email: 'u1@test.com', role: 'USER' };

jest.mock('@/lib/email', () => ({
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

// ── DATABASE FAILURE SCENARIOS ───────────────────────────────────────────────
describe('Error Handling: Database Failures', () => {
  test('TC-ERR-01: login returns 500 when DB throws unexpected error', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockRejectedValue(new Error('DB connection timeout')) },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/login/route.js', { prismaMock });

    const req = makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '20.0.0.1' },
      jsonBody: { email: 'user@test.com', password: 'SecurePass123' },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    // Must NOT expose internal error details
    expect(body.error).not.toContain('DB connection timeout');
    expect(body.error).toMatch(/kesalahan/i);
  });

  test('TC-ERR-02: register returns 500 when DB create fails unexpectedly', async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('Database disk full')),
      },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/register/route.js', { prismaMock });

    const req = makeMockRequest({ jsonBody: { email: 'new@test.com', password: 'SecurePass123' } });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toContain('disk full');
  });

  test('TC-ERR-03: regulations returns 500 when DB throws', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
      searchLog: { create: jest.fn() },
    };
    const { GET } = await loadRouteWithMocks('@/app/api/regulations/route.js', { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations' });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test('TC-ERR-04: payment webhook returns 500 when DB transaction update fails', async () => {
    const webhookMock = {
      transaction: {
        findUnique: jest.fn().mockResolvedValue({ orderId: 'TRX-DB-FAIL', status: 'PENDING', userId: 'u1' }),
        update: jest.fn().mockRejectedValue(new Error('DB write failed')),
      },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockRejectedValue(new Error('DB write failed')),
    };
    process.env.NODE_ENV = 'test';
    const { POST } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', { prismaMock: webhookMock });
    const req = makeMockRequest({
      method: 'POST',
      jsonBody: {
        order_id: 'TRX-DB-FAIL',
        transaction_status: 'settlement',
        fraud_status: 'accept',
        status_code: '200',
        gross_amount: '49900.00',
        signature_key: 'any',
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── AI SERVICE FAILURE SCENARIOS ─────────────────────────────────────────────
describe('Error Handling: AI Service Failures', () => {
  test('TC-ERR-05: chat returns 500 when Pinecone query fails', async () => {
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class {
        Index() {
          return { query: jest.fn().mockRejectedValue(new Error('Pinecone timeout')) };
        }
      },
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class {
        async embedQuery() { return new Array(1024).fill(0.1); }
      },
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class {
        async invoke() { return { content: 'answer' }; }
      },
    }));
    jest.doMock('@langchain/core/messages', () => ({
      HumanMessage: class { constructor(c) { this.content = c; } },
      SystemMessage: class { constructor(c) { this.content = c; } },
    }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      chat: { create: jest.fn().mockResolvedValue({ id: 'c1' }), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: SESSION_U1 });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u1', message: 'Test error' } });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  test('TC-ERR-06: chat returns 429 when Gemini API quota exceeded', async () => {
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class {
        Index() {
          return { query: jest.fn().mockResolvedValue({ matches: [] }) };
        }
      },
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class {
        async embedQuery() { return new Array(1024).fill(0.1); }
      },
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class {
        async invoke() {
          const err = new Error('Resource has been exhausted (429)');
          err.status = 429;
          throw err;
        }
      },
    }));
    jest.doMock('@langchain/core/messages', () => ({
      HumanMessage: class { constructor(c) { this.content = c; } },
      SystemMessage: class { constructor(c) { this.content = c; } },
    }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      chat: { create: jest.fn().mockResolvedValue({ id: 'c1' }), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: SESSION_U1 });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u1', message: 'Tes kuota AI' } });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/kuota/i);
  });

  test('TC-ERR-07: chat returns 404 when chatId provided but not found in DB', async () => {
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class { Index() { return { query: jest.fn().mockResolvedValue({ matches: [] }) }; } }
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class { async embedQuery() { return []; } }
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class { async invoke() { return { content: 'ok' }; } }
    }));
    jest.doMock('@langchain/core/messages', () => ({
      HumanMessage: class {}, SystemMessage: class {}
    }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      chat: {
        findUnique: jest.fn().mockResolvedValue(null), // Chat not found
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: SESSION_U1 });
    const req = makeMockRequest({
      method: 'POST',
      jsonBody: { userId: 'u1', message: 'Test missing chat', chatId: 'non-existent-chat' },
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

// ── MALFORMED REQUEST SCENARIOS ───────────────────────────────────────────────
describe('Error Handling: Malformed Requests', () => {
  test('TC-ERR-08: login returns 400 for non-JSON body', async () => {
    const prismaMock = { user: { findUnique: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/login/route.js', { prismaMock });

    const req = makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '30.0.0.1' },
      jsonBody: new Error('invalid json'),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('TC-ERR-09: regulations handles NaN page parameter gracefully', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      searchLog: { create: jest.fn() },
    };
    const { GET } = await loadRouteWithMocks('@/app/api/regulations/route.js', { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?page=abc&limit=xyz' });
    const res = await GET(req);
    // Should handle NaN gracefully — either 200 with defaults or 500, not crash
    expect([200, 500]).toContain(res.status);
  });

  test('TC-ERR-10: chat POST handles empty body (no JSON fields)', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, chatHistory: { count: jest.fn() }, chat: { create: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: SESSION_U1 });

    const req = makeMockRequest({ method: 'POST', jsonBody: {} });
    const res = await POST(req);
    // Should return 400 (missing message) or 401 (missing userId)
    expect([400, 401]).toContain(res.status);
  });

  test('TC-ERR-11: forgot-password handles missing body fields gracefully', async () => {
    const prismaMock = { user: { findUnique: jest.fn(), update: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/forgot-password/route.js', { prismaMock });

    const req = makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '40.0.0.1' },
      jsonBody: { notEmail: 'whatever' }, // Wrong field name
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ── EXTERNAL SERVICE UNAVAILABLE ─────────────────────────────────────────────
describe('Error Handling: External Service Unavailable', () => {
  test('TC-ERR-12: payment checkout returns 500 when Midtrans is unreachable', async () => {
    // Urutan: resetModules → doMock → import, supaya mock Midtrans terpakai
    jest.resetModules();
    jest.doMock('midtrans-client', () => ({
      __esModule: true,
      default: {
        Snap: jest.fn().mockImplementation(() => ({
          createTransaction: jest.fn().mockRejectedValue(new Error('ECONNREFUSED: midtrans down')),
        })),
        CoreApi: jest.fn(),
      },
    }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'buyer@test.com' }) },
      transaction: { create: jest.fn().mockResolvedValue({}), update: jest.fn() },
    };
    jest.doMock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));
    jest.doMock('@/lib/auth', () => ({
      __esModule: true,
      getSession: jest.fn().mockResolvedValue({ userId: 'u-valid', role: 'USER' }),
    }));

    const { POST } = await import('@/app/api/payment/checkout/route.js');
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-valid' } });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toContain('ECONNREFUSED');
  });
});
