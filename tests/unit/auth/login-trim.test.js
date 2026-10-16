import bcrypt from 'bcryptjs';
import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Regresi: registrasi menyimpan password yang sudah di-trim, sedangkan login dulu
// membandingkan password apa adanya → pengguna yang mendaftar dengan spasi di awal/
// akhir password tidak bisa login.
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login — password dengan spasi di awal/akhir', () => {
  const user = async (plain) => ({
    id: 'u1', email: 'spasi@test.com', name: 'U', role: 'USER', tier: 'FREE', promptLimit: 50, avatarUrl: null,
    passwordHash: await bcrypt.hash(plain, 4),
  });

  test('TC-LOGIN-07: akun hasil registrasi (hash dari password ter-trim) bisa login dengan password yang sama persis seperti saat daftar', async () => {
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(await user('rahasia123')) } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/login/route.js', { prismaMock });
    const res = await POST(makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '7.7.7.1' },
      jsonBody: { email: 'spasi@test.com', password: '  rahasia123 ' },
    }));
    expect(res.status).toBe(200);
  });

  test('TC-LOGIN-08: password salah tetap ditolak (perbaikan tidak melonggarkan login)', async () => {
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(await user('rahasia123')) } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/login/route.js', { prismaMock });
    const res = await POST(makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '7.7.7.2' },
      jsonBody: { email: 'spasi@test.com', password: ' rahasia124 ' },
    }));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/admin/users — sisa kuota', () => {
  test('TC-ADMIN-QUOTA-01: sisa kuota dihitung dari PromptUsage, bukan dari riwayat chat', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'u2', name: 'A', email: 'a@test.com', role: 'USER', tier: 'FREE', promptLimit: 10, createdAt: new Date(), _count: { promptUsages: 7 }, messages: [] },
    ]);
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'admin', role: 'ADMIN' }), findMany } };
    const { GET } = await loadRouteWithMocks('@/app/api/admin/users/route.js', { prismaMock, authSession: { userId: 'admin', role: 'ADMIN' } });
    const res = await GET(makeMockRequest({ method: 'GET' }));
    expect(res.status).toBe(200);
    const [row] = await res.json();
    expect(row.remainingQuota).toBe(3);
    expect(findMany.mock.calls[0][0].select._count.select).toHaveProperty('promptUsages');
  });
});
