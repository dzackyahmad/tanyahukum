import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: POST /api/payment/checkout
// Cakupan: auth, order creation, Midtrans integration, DB persistence
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('midtrans-client', () => ({
  __esModule: true,
  default: {
    Snap: jest.fn().mockImplementation(() => ({
      createTransaction: jest.fn().mockResolvedValue({
        token: 'snap-token-abc123',
        redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc123',
      }),
    })),
    CoreApi: jest.fn().mockImplementation(() => ({
      transaction: { status: jest.fn() },
    })),
  },
}));

describe('POST /api/payment/checkout', () => {
  const baseRoute = '@/app/api/payment/checkout/route.js';

  // ── HAPPY PATH ──────────────────────────────────────────────────────────────
  test('TC-PAY-01: returns snap token and redirect_url on success', async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com' }),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-test';
    process.env.MIDTRANS_CLIENT_KEY = 'SB-Mid-client-test';

    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u-valid' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-valid' } });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe('snap-token-abc123');
    expect(body.redirect_url).toContain('midtrans.com');
  });

  test('TC-PAY-02: creates PENDING transaction record before calling Midtrans', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com' }) },
      transaction: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u-valid' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-valid' } });
    await POST(req);

    const createCall = prismaMock.transaction.create.mock.calls[0]?.[0];
    expect(createCall.data.status).toBe('PENDING');
    expect(createCall.data.amount).toBe(49900);
    expect(createCall.data.userId).toBe('u-valid');
  });

  test('TC-PAY-03: updates transaction with paymentUrl after Midtrans success', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com' }) },
      transaction: {
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u-valid' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-valid' } });
    await POST(req);

    const updateCall = prismaMock.transaction.update.mock.calls[0]?.[0];
    expect(updateCall.data.paymentUrl).toContain('midtrans.com');
  });

  // ── AUTH GATE ───────────────────────────────────────────────────────────────
  test('TC-PAY-04: returns 401 when not logged in (no session)', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn() },
      transaction: { create: jest.fn(), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });
    const req = makeMockRequest({ method: 'POST', jsonBody: {} });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  test('TC-PAY-05: returns 404 when user does not exist', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      transaction: { create: jest.fn(), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'ghost' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'ghost' } });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  // ── ORDER ID UNIQUENESS ─────────────────────────────────────────────────────
  test('TC-PAY-06: generates unique orderId with timestamp prefix', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com' }) },
      transaction: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u1' } });
    const { getSession } = await import('@/lib/auth');
    getSession.mockResolvedValueOnce({ userId: 'u1' }).mockResolvedValueOnce({ userId: 'u2' });

    // Two sequential requests should produce different orderIds
    const req1 = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u1' } });
    const req2 = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u2' } });
    await POST(req1);
    await POST(req2);

    const orderId1 = prismaMock.transaction.create.mock.calls[0]?.[0]?.data?.orderId;
    const orderId2 = prismaMock.transaction.create.mock.calls[1]?.[0]?.data?.orderId;
    expect(orderId1).toMatch(/^TRX-\d+-/);
    expect(orderId1).not.toBe(orderId2);
  });

  // ── PRO USER DOUBLE PAYMENT — FIXED ──────────────────────────────────────
  test('TC-PAY-07: [FIXED] user yang sudah PRO ditolak checkout — 400', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'pro@test.com', tier: 'PRO' }) },
      transaction: { create: jest.fn(), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u-already-pro' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-already-pro' } });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/sudah berlangganan PRO/i);
    // Tidak boleh buat transaksi baru untuk user PRO
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  // ── IDOR PROTECTION ─────────────────────────────────────────────────────
  test('TC-PAY-08: [SECURITY] userId di body yang beda dengan sesi ditolak 403', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn() },
      transaction: { create: jest.fn(), update: jest.fn() },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'attacker' } });
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'victim' } });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  // ── ERROR HANDLING ───────────────────────────────────────────────────────────
  test('TC-PAY-09: returns 500 when Midtrans createTransaction throws', async () => {
    // Bypass loadRouteWithMocks: set up mocks AFTER jest.resetModules() so they
    // are picked up by the fresh import. Order: resetModules → doMock → import.
    jest.resetModules();
    jest.doMock('midtrans-client', () => ({
      __esModule: true,
      default: {
        Snap: jest.fn().mockImplementation(() => ({
          createTransaction: jest.fn().mockRejectedValue(new Error('Midtrans unreachable')),
        })),
        CoreApi: jest.fn(),
      },
    }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@test.com' }) },
      transaction: { create: jest.fn().mockResolvedValue({}), update: jest.fn() },
    };
    jest.doMock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));
    jest.doMock('@/lib/auth', () => ({
      __esModule: true,
      getSession: jest.fn().mockResolvedValue({ userId: 'u-valid' }),
    }));

    const { POST } = await import('@/app/api/payment/checkout/route.js');
    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'u-valid' } });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
