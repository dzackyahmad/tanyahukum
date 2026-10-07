import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Security Tests: Hardening tambahan (defense-in-depth & privasi data)
// ─────────────────────────────────────────────────────────────────────────────

describe('SECURITY: Admin route guard (lapisan kedua di belakang middleware)', () => {
  test('S-ADM-01: tanpa sesi → 401, DB tidak disentuh', async () => {
    const prismaMock = { user: { findUnique: jest.fn(), findMany: jest.fn() } };
    const { GET } = await loadRouteWithMocks('@/app/api/admin/users/route.js', { prismaMock, authSession: null });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  test('S-ADM-02: token lama berisi role ADMIN tapi di DB sudah USER → 403', async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'demoted', role: 'USER' }),
        findMany: jest.fn(),
      },
    };
    const { GET } = await loadRouteWithMocks('@/app/api/admin/users/route.js', {
      prismaMock,
      authSession: { userId: 'demoted', role: 'ADMIN' },
    });
    const res = await GET();
    expect(res.status).toBe(403);
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });

  test('S-ADM-03: admin valid tetap bisa akses', async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const { GET } = await loadRouteWithMocks('@/app/api/admin/users/route.js', {
      prismaMock,
      authSession: { userId: 'admin-1', role: 'ADMIN' },
    });
    const res = await GET();
    expect(res.status).toBe(200);
  });

  test('S-ADM-04: respons create user tidak membawa passwordHash/resetToken', async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }),
        create: jest.fn().mockResolvedValue({ id: 'n1', email: 'new@test.com' }),
      },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/admin/users/route.js', {
      prismaMock,
      authSession: { userId: 'admin-1', role: 'ADMIN' },
    });
    const req = makeMockRequest({ method: 'POST', jsonBody: { email: 'New@Test.com', password: 'Password123' } });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const args = prismaMock.user.create.mock.calls[0][0];
    expect(args.select.passwordHash).toBeUndefined();
    expect(args.select.resetToken).toBeUndefined();
    expect(args.data.email).toBe('new@test.com'); // dinormalisasi lowercase
  });

  test('S-ADM-05: newsLink javascript: ditolak, link tanpa skema dilengkapi https://', async () => {
    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }) },
      trendingIssue: { create: jest.fn().mockResolvedValue({ id: 't1' }) },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/admin/trending/route.js', {
      prismaMock,
      authSession: { userId: 'admin-1', role: 'ADMIN' },
    });

    const bad = await POST(makeMockRequest({
      method: 'POST',
      jsonBody: { title: 'T', description: 'D', newsLink: 'javascript:alert(1)' },
    }));
    expect(bad.status).toBe(400);
    expect(prismaMock.trendingIssue.create).not.toHaveBeenCalled();

    const ok = await POST(makeMockRequest({
      method: 'POST',
      jsonBody: { title: 'T', description: 'D', newsLink: 'kompas.com/berita' },
    }));
    expect(ok.status).toBe(201);
    expect(prismaMock.trendingIssue.create.mock.calls[0][0].data.newsLink).toBe('https://kompas.com/berita');
  });
});

describe('SECURITY: Payment webhook', () => {
  test('S-WH-01: server key tidak pernah tercetak di log', async () => {
    process.env.NODE_ENV = 'test';
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-SUPERSECRET';
    const spies = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));

    const prismaMock = {
      transaction: { findUnique: jest.fn().mockResolvedValue({ orderId: 'O1', status: 'PENDING', userId: 'U1', amount: 49900 }), update: jest.fn() },
      user: { update: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const { POST } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', { prismaMock });
    await POST(makeMockRequest({
      method: 'POST',
      jsonBody: { order_id: 'O1', transaction_status: 'settlement', status_code: '200', gross_amount: '49900.00', signature_key: 'x' },
    }));

    const logged = spies.flatMap((s) => s.mock.calls.flat()).map(String).join(' ');
    expect(logged).not.toContain('SUPERSECRET');
    spies.forEach((s) => s.mockRestore());
  });

  test('S-WH-02: production + server key kosong → 500 (fail-closed)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MIDTRANS_SERVER_KEY = '';
    const prismaMock = { transaction: { findUnique: jest.fn() }, user: { update: jest.fn() }, $transaction: jest.fn() };
    const { POST } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', { prismaMock });
    const res = await POST(makeMockRequest({
      method: 'POST',
      jsonBody: { order_id: 'O1', transaction_status: 'settlement', status_code: '200', gross_amount: '49900.00', signature_key: 'x' },
    }));
    expect(res.status).toBe(500);
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
    process.env.NODE_ENV = 'test';
  });

  test('S-WH-03: nominal dibayar tidak sama dengan nominal transaksi → ditolak', async () => {
    process.env.NODE_ENV = 'test';
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-xxx';
    const prismaMock = {
      transaction: { findUnique: jest.fn().mockResolvedValue({ orderId: 'O2', status: 'PENDING', userId: 'U1', amount: 49900 }), update: jest.fn() },
      user: { update: jest.fn() },
      $transaction: jest.fn(),
    };
    const { POST } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', { prismaMock });
    const res = await POST(makeMockRequest({
      method: 'POST',
      jsonBody: { order_id: 'O2', transaction_status: 'settlement', status_code: '200', gross_amount: '1.00', signature_key: 'x' },
    }));
    expect(res.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  test('S-WH-04: GET health check tidak menampilkan potongan server key', async () => {
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-xxx';
    const { GET } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', {});
    const body = await (await GET()).json();
    expect(JSON.stringify(body)).not.toContain('SB-Mid');
  });
});

describe('SECURITY: Download proxy', () => {
  test('S-DL-01: URL http (non-HTTPS) ditolak', async () => {
    global.fetch = jest.fn();
    const { GET } = await loadRouteWithMocks('@/app/api/regulations/download/route.js', {});
    const res = await GET(makeMockRequest({
      url: 'http://localhost/api/regulations/download?url=http://abc.supabase.co/x.pdf',
    }));
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('S-DL-02: fetch tidak mengikuti redirect', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 302 });
    const { GET } = await loadRouteWithMocks('@/app/api/regulations/download/route.js', {});
    const res = await GET(makeMockRequest({
      url: 'http://localhost/api/regulations/download?url=https://abc.supabase.co/x.pdf',
    }));
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'manual' }));
    expect(res.status).toBe(502);
  });
});

describe('PRIVACY: Forgot password', () => {
  test('S-FP-01: resetUrl tidak pernah dikembalikan di luar development', async () => {
    jest.doMock('@/lib/email', () => ({ sendResetPasswordEmail: jest.fn().mockResolvedValue({ success: true }) }));
    process.env.NODE_ENV = 'test';
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'user@test.com' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/forgot-password/route.js', { prismaMock });
    const res = await POST(makeMockRequest({
      method: 'POST',
      headers: { 'x-forwarded-for': '50.0.0.1' },
      jsonBody: { email: '  User@Test.com ' },
    }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.resetUrl).toBeUndefined();
    // email dinormalisasi sebelum lookup
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'user@test.com' } });
  });
});

describe('SECURITY: Middleware CSRF & halaman admin', () => {
  const makeReq = ({ pathname, method = 'GET', origin, host = 'tanyahukum.app', token }) => ({
    method,
    url: `https://${host}${pathname}`,
    nextUrl: { pathname, host },
    headers: { get: (n) => (n.toLowerCase() === 'origin' ? origin ?? null : null) },
    cookies: { get: (n) => (n === 'token' && token ? { value: token } : undefined) },
  });

  test('S-CSRF-01: POST API dari origin lain ditolak 403', async () => {
    const { middleware } = await import('@/middleware');
    const res = await middleware(makeReq({ pathname: '/api/profile', method: 'DELETE', origin: 'https://evil.com' }));
    expect(res.status).toBe(403);
  });

  test('S-CSRF-02: POST API dari origin sendiri & webhook tanpa Origin tetap lolos', async () => {
    const { middleware } = await import('@/middleware');
    const same = await middleware(makeReq({ pathname: '/api/chat', method: 'POST', origin: 'https://tanyahukum.app' }));
    expect(same.status).not.toBe(403);
    const webhook = await middleware(makeReq({ pathname: '/api/payment/webhook', method: 'POST' }));
    expect(webhook.status).not.toBe(403);
  });

  test('S-ADMPAGE-01: halaman /admin tanpa token admin di-redirect ke /chatbot', async () => {
    process.env.JWT_SECRET = 'page-guard-secret';
    const { SignJWT } = await import('jose');
    const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const userToken = await new SignJWT({ role: 'USER' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key);
    const adminToken = await new SignJWT({ role: 'ADMIN' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key);
    const { middleware } = await import('@/middleware');

    const anon = await middleware(makeReq({ pathname: '/admin/manage-user' }));
    expect(anon.status).toBe(307);
    expect(anon.headers.get('location')).toContain('/chatbot');

    const user = await middleware(makeReq({ pathname: '/admin', token: userToken }));
    expect(user.status).toBe(307);

    const admin = await middleware(makeReq({ pathname: '/admin', token: adminToken }));
    expect(admin.status).toBe(200);
  });
});

describe('SECURITY: Validasi admin users', () => {
  const ADMIN = { userId: '11111111-1111-1111-1111-111111111111', role: 'ADMIN' };
  const adminPrisma = (extra = {}) => ({
    user: { findUnique: jest.fn().mockResolvedValue({ id: ADMIN.userId, role: 'ADMIN' }), update: jest.fn().mockResolvedValue({}), delete: jest.fn(), ...extra },
  });

  test('S-USR-01: role "AI" atau tier tidak dikenal ditolak 400', async () => {
    const prismaMock = adminPrisma();
    const { PATCH } = await loadRouteWithMocks('@/app/api/admin/users/[id]/route.js', { prismaMock, authSession: ADMIN });
    const res = await PATCH(
      makeMockRequest({ method: 'PATCH', jsonBody: { role: 'AI' } }),
      { params: Promise.resolve({ id: '22222222-2222-2222-2222-222222222222' }) }
    );
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  test('S-USR-02: admin tidak bisa menghapus / menurunkan role dirinya sendiri', async () => {
    const prismaMock = adminPrisma();
    const { DELETE, PATCH } = await loadRouteWithMocks('@/app/api/admin/users/[id]/route.js', { prismaMock, authSession: ADMIN });
    const params = { params: Promise.resolve({ id: ADMIN.userId }) };

    const del = await DELETE(makeMockRequest({ method: 'DELETE' }), params);
    expect(del.status).toBe(400);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();

    const demote = await PATCH(makeMockRequest({ method: 'PATCH', jsonBody: { role: 'USER' } }), { params: Promise.resolve({ id: ADMIN.userId }) });
    expect(demote.status).toBe(400);
  });
});

describe('PRIVACY: Detail regulasi publik', () => {
  test('S-REG-01: dokumen nonaktif → 404 dan query tidak mengambil `content`', async () => {
    const prismaMock = { regulation: { findUnique: jest.fn().mockResolvedValue({ id: 'r1', isActive: false }), update: jest.fn() } };
    const { GET } = await loadRouteWithMocks('@/app/api/regulations/[id]/route.js', { prismaMock });
    const res = await GET(makeMockRequest({ url: 'http://localhost/api/regulations/r1' }), { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(404);
    const args = prismaMock.regulation.findUnique.mock.calls[0][0];
    expect(args.select.content).toBeUndefined();
    expect(args.select.filePath).toBeUndefined();
  });

  test('S-REG-02: spam view count dari IP yang sama tidak dihitung, respons tetap 200', async () => {
    const prismaMock = { regulation: { update: jest.fn().mockResolvedValue({}) } };
    const { PATCH } = await loadRouteWithMocks('@/app/api/regulations/[id]/route.js', { prismaMock });
    for (let i = 0; i < 10; i++) {
      const res = await PATCH(
        makeMockRequest({ method: 'PATCH', headers: { 'x-forwarded-for': '9.9.9.9' } }),
        { params: Promise.resolve({ id: 'r1' }) }
      );
      expect(res.status).toBe(200);
    }
    expect(prismaMock.regulation.update).toHaveBeenCalledTimes(3);
  });
});

describe('SECURITY: Google login config', () => {
  test('S-GGL-01: GOOGLE_CLIENT_ID kosong → 500 (fail-closed, audience tidak dilewati)', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    const prismaMock = { user: { findUnique: jest.fn(), create: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/google/route.js', { prismaMock });
    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { credentialToken: 'x' } }));
    expect(res.status).toBe(500);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    process.env.GOOGLE_CLIENT_ID = saved;
  });
});
