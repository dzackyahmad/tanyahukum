import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Security Tests: Checkout IDOR — FIXED
// Sebelum fix: userId diambil dari body tanpa cek sesi → siapa pun bisa membuat
//              transaksi atas nama user lain (tanpa login).
// Setelah fix: userId diambil dari JWT (getSession); body userId harus cocok.
// ─────────────────────────────────────────────────────────────────────────────

jest.mock('midtrans-client', () => ({
  __esModule: true,
  default: {
    Snap: class Snap {
      async createTransaction() {
        return { token: 't', redirect_url: 'http://midtrans/redirect' };
      }
    },
  },
}));

const baseRoute = '@/app/api/payment/checkout/route.js';

describe('/api/payment/checkout authorization (IDOR) — FIXED', () => {
  test('SECURITY: [FIXED] tanpa sesi login ditolak 401 walau body berisi userId korban', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, transaction: { create: jest.fn(), update: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'victim-user-id' } });
    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  test('SECURITY: [FIXED] user login tidak bisa checkout atas nama user lain (403)', async () => {
    const prismaMock = { user: { findUnique: jest.fn() }, transaction: { create: jest.fn(), update: jest.fn() } };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'attacker-id' } });

    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'victim-user-id' } });
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  test('checkout untuk diri sendiri tetap berjalan normal', async () => {
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-xxx';
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'me@example.com', tier: 'FREE' }) },
      transaction: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'me-id' } });

    const req = makeMockRequest({ method: 'POST', jsonBody: { userId: 'me-id' } });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'me-id' }) })
    );
  });
});
