import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';
import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────────────────────────
// Security Tests: Hardening P1 (tambahan) — header, JWT, rate limit, upload,
// logout, profil, email TLS, konfigurasi Midtrans
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_SESSION = { userId: 'admin-1', role: 'ADMIN' };
const adminUserLookup = () => jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

// File-like object untuk formData.get('file')
function fakeFile({ name, type, bytes }) {
  const buf = Buffer.from(bytes);
  return { name, type, size: buf.length, arrayBuffer: async () => buf };
}
const formDataWith = (file) => ({ get: (k) => (k === 'file' ? file : null) });

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48];

describe('SECURITY HEADERS (next.config.mjs)', () => {
  test('S-HDR-01: semua route mendapat header keamanan & X-Powered-By dimatikan', async () => {
    // Muat next.config.mjs asli lewat proses Node terpisah (ESM murni, persis seperti Next.js)
    const { execFileSync } = require('child_process');
    const script =
      "import('./next.config.mjs').then(async ({ default: c }) => " +
      "console.log(JSON.stringify({ poweredByHeader: c.poweredByHeader, rules: await c.headers() })))";
    const config = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: process.cwd() }).toString());
    expect(config.poweredByHeader).toBe(false);

    const [rule] = config.rules;
    expect(rule.source).toBe('/:path*');
    const h = Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
    expect(h['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(h['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    expect(h['Strict-Transport-Security']).toContain('max-age=');
  });
});

describe('JWT algorithm pinning', () => {
  test('S-JWT-01: token ADMIN yang ditandatangani HS512 (bukan HS256) ditolak middleware', async () => {
    process.env.JWT_SECRET = 'alg-pinning-secret-key-for-tests-only-123456789';
    const { SignJWT } = await import('jose');
    const key = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS512' })
      .setExpirationTime('1h')
      .sign(key);

    const { middleware } = await import('@/middleware');
    const res = await middleware({
      nextUrl: { pathname: '/api/admin/users' },
      cookies: { get: (n) => (n === 'token' ? { value: token } : undefined) },
    });
    expect(res.status).toBe(401);
  });
});

describe('RATE LIMIT', () => {
  test('S-RL-01: login dibatasi per email walau IP berganti-ganti (11x → 429)', async () => {
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/login/route.js', { prismaMock });

    let last;
    for (let i = 0; i < 11; i++) {
      last = await POST(makeMockRequest({
        method: 'POST',
        headers: { 'x-forwarded-for': `77.0.0.${i}` },
        jsonBody: { email: 'target@test.com', password: 'WrongPass123' },
      }));
    }
    expect(last.status).toBe(429);
  });

  test('S-RL-02: kuota register dan login terpisah (register tidak menghabiskan kuota login)', async () => {
    jest.resetModules();
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'x', authProvider: 'CREDENTIALS' }), create: jest.fn() } };
    jest.doMock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));
    const register = (await import('@/app/api/auth/register/route.js')).POST;
    const login = (await import('@/app/api/auth/login/route.js')).POST;
    const ip = { 'x-forwarded-for': '88.0.0.1' };

    for (let i = 0; i < 6; i++) {
      await register(makeMockRequest({ method: 'POST', headers: ip, jsonBody: { email: `r${i}@test.com`, password: 'Password123' } }));
    }
    const res = await login(makeMockRequest({ method: 'POST', headers: ip, jsonBody: { email: 'a@test.com', password: 'Password123' } }));
    expect(res.status).not.toBe(429);
  });

  test('S-RL-03: reset-password dibatasi per IP (11x → 429)', async () => {
    const prismaMock = { user: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/reset-password/route.js', { prismaMock });
    let last;
    for (let i = 0; i < 11; i++) {
      last = await POST(makeMockRequest({
        method: 'POST',
        headers: { 'x-forwarded-for': '66.0.0.1' },
        jsonBody: { token: 'guess', newPassword: 'NewPassword123' },
      }));
    }
    expect(last.status).toBe(429);
  });

  test('S-RL-04: chat dibatasi 15 pesan/menit per user (16x → 429)', async () => {
    jest.doMock('@pinecone-database/pinecone', () => ({
      Pinecone: class { Index() { return { query: jest.fn().mockResolvedValue({ matches: [] }) }; } },
    }));
    jest.doMock('@langchain/community/embeddings/voyage', () => ({
      VoyageEmbeddings: class { async embedQuery() { return [0.1]; } },
    }));
    jest.doMock('@langchain/google-genai', () => ({
      ChatGoogleGenerativeAI: class { async invoke() { return { content: 'ok' }; } },
    }));
    jest.doMock('@langchain/core/messages', () => ({ HumanMessage: class {}, SystemMessage: class {} }));

    const prismaMock = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-spam', tier: 'PRO', promptLimit: 0, personalContext: null }) },
      chatHistory: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      chat: { create: jest.fn().mockResolvedValue({ id: 'c1' }), update: jest.fn().mockResolvedValue({}) },
    };
    const { POST } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: { userId: 'u-spam' } });

    const statuses = [];
    for (let i = 0; i < 16; i++) {
      const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { message: `Pertanyaan ${i}` } }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(statuses[15]).toBe(429);
  });
});

describe('LOGIN GOOGLE', () => {
  test('S-GGL-02: email Google yang belum terverifikasi ditolak 403', async () => {
    process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id';
    jest.doMock('google-auth-library', () => ({
      OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({ email: 'victim@company.com', email_verified: false }),
        }),
      })),
    }));
    const prismaMock = { user: { findUnique: jest.fn(), create: jest.fn() } };
    const { POST } = await loadRouteWithMocks('@/app/api/auth/google/route.js', { prismaMock });
    const res = await POST(makeMockRequest({ method: 'POST', jsonBody: { credentialToken: 'tok' } }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    jest.dontMock('google-auth-library');
  });
});

describe('LOGOUT', () => {
  test('S-OUT-01: cookie sesi tetap dihapus walau Supabase error', async () => {
    jest.resetModules();
    jest.doMock('@/utils/supabase/server', () => ({
      createClient: jest.fn().mockRejectedValue(new Error('Supabase URL dan Anon Key belum diset.')),
    }));
    const { POST } = await import('@/app/api/logout/route.js');
    const res = await POST(makeMockRequest({ method: 'POST', url: 'http://localhost/api/logout' }));

    const cookie = res.cookies.get('token');
    expect(cookie).toBeDefined();
    expect(cookie.value).toBe('');
    expect(new Date(cookie.expires).getTime()).toBe(0);
  });
});

describe('PROFIL', () => {
  const SECRET = 'profile-extra-test-secret';
  const token = () => {
    process.env.JWT_SECRET = SECRET;
    return jwt.sign({ userId: 'u1' }, SECRET);
  };
  const baseUser = { id: 'u1', email: 'user@test.com', passwordHash: '$2b$10$x', authProvider: 'CREDENTIALS' };

  test('S-PRF-01: email baru dinormalisasi (trim + lowercase)', async () => {
    const t = token();
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(baseUser), update: jest.fn().mockResolvedValue({ id: 'u1' }) } };
    const { PATCH } = await loadRouteWithMocks('@/app/api/profile/route.js', { prismaMock });
    const res = await PATCH(makeMockRequest({ cookies: { token: t }, jsonBody: { email: '  New@Mail.COM ' } }));
    expect(res.status).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0].data.email).toBe('new@mail.com');
  });

  test('S-PRF-02: email yang sudah dipakai akun lain → 409 (bukan 401)', async () => {
    const t = token();
    const prismaMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(baseUser),
        update: jest.fn().mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' })),
      },
    };
    const { PATCH } = await loadRouteWithMocks('@/app/api/profile/route.js', { prismaMock });
    const res = await PATCH(makeMockRequest({ cookies: { token: t }, jsonBody: { email: 'taken@test.com' } }));
    expect(res.status).toBe(409);
  });

  test('S-PRF-03: akun Google (tanpa password) ganti password → 400 jelas, bukan crash', async () => {
    const t = token();
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue({ ...baseUser, passwordHash: null, authProvider: 'GOOGLE' }), update: jest.fn() } };
    const { PATCH } = await loadRouteWithMocks('@/app/api/profile/route.js', { prismaMock });
    const res = await PATCH(makeMockRequest({ cookies: { token: t }, jsonBody: { currentPassword: 'x', newPassword: 'NewPassword123' } }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  test('S-PRF-04: email format salah & personalContext bukan string ditolak 400', async () => {
    const t = token();
    const prismaMock = { user: { findUnique: jest.fn().mockResolvedValue(baseUser), update: jest.fn() } };
    const { PATCH } = await loadRouteWithMocks('@/app/api/profile/route.js', { prismaMock });
    const bad1 = await PATCH(makeMockRequest({ cookies: { token: t }, jsonBody: { email: 'bukan-email' } }));
    const bad2 = await PATCH(makeMockRequest({ cookies: { token: t }, jsonBody: { personalContext: { a: 1 } } }));
    expect(bad1.status).toBe(400);
    expect(bad2.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe('UPLOAD — validasi isi file (magic bytes)', () => {
  function mockSupabase() {
    const upload = jest.fn().mockResolvedValue({ data: {}, error: null });
    jest.doMock('@/utils/supabase/server', () => ({
      createAdminClient: jest.fn().mockResolvedValue({
        storage: {
          listBuckets: jest.fn().mockResolvedValue({ data: [{ name: 'legal-documents' }] }),
          createBucket: jest.fn(),
          from: () => ({ upload, getPublicUrl: () => ({ data: { publicUrl: 'https://abc.supabase.co/x' } }) }),
        },
      }),
    }));
    return upload;
  }

  test('S-UPL-01: avatar berlabel PNG tapi isinya bukan gambar ditolak 400', async () => {
    process.env.JWT_SECRET = 'upload-test-secret';
    const t = jwt.sign({ userId: 'u1' }, 'upload-test-secret');
    const upload = mockSupabase();
    const prismaMock = { user: { update: jest.fn().mockResolvedValue({ id: 'u1' }) } };
    const { POST } = await loadRouteWithMocks('@/app/api/profile/upload/route.js', { prismaMock });

    const fake = fakeFile({ name: 'shell.png', type: 'image/png', bytes: Buffer.from('<?php system($_GET[1]); ?>') });
    const res = await POST(makeMockRequest({ method: 'POST', cookies: { token: t }, formData: formDataWith(fake) }));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  test('S-UPL-02: avatar PNG asli tetap bisa diupload', async () => {
    process.env.JWT_SECRET = 'upload-test-secret';
    const t = jwt.sign({ userId: 'u1' }, 'upload-test-secret');
    const upload = mockSupabase();
    const prismaMock = { user: { update: jest.fn().mockResolvedValue({ id: 'u1' }) } };
    const { POST } = await loadRouteWithMocks('@/app/api/profile/upload/route.js', { prismaMock });

    const real = fakeFile({ name: 'me.png', type: 'image/png', bytes: PNG_HEADER });
    const res = await POST(makeMockRequest({ method: 'POST', cookies: { token: t }, formData: formDataWith(real) }));
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  test('S-UPL-03: dokumen admin berlabel PDF tapi isinya bukan PDF ditolak 400', async () => {
    const upload = mockSupabase();
    const prismaMock = { user: { findUnique: adminUserLookup() } };
    const { POST } = await loadRouteWithMocks('@/app/api/admin/regulations/upload/route.js', { prismaMock, authSession: ADMIN_SESSION });

    const fake = fakeFile({ name: 'uu.pdf', type: 'application/pdf', bytes: Buffer.from('MZ\x90\x00 executable') });
    const res = await POST(makeMockRequest({ method: 'POST', formData: formDataWith(fake) }));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });

  test('S-UPL-04: dokumen PDF asli tetap bisa diupload admin', async () => {
    const upload = mockSupabase();
    const prismaMock = { user: { findUnique: adminUserLookup() } };
    const { POST } = await loadRouteWithMocks('@/app/api/admin/regulations/upload/route.js', { prismaMock, authSession: ADMIN_SESSION });

    const pdf = fakeFile({ name: 'uu.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF-1.7\n...') });
    const res = await POST(makeMockRequest({ method: 'POST', formData: formDataWith(pdf) }));
    expect(res.status).toBe(200);
    expect(upload).toHaveBeenCalledTimes(1);
  });
});

describe('VALIDASI INPUT CHAT', () => {
  test('S-CHT-01: rename judul chat > 200 karakter ditolak 400', async () => {
    const prismaMock = { chat: { findUnique: jest.fn(), update: jest.fn() } };
    const { PATCH } = await loadRouteWithMocks('@/app/api/chat/route.js', { prismaMock, authSession: { userId: 'u1' } });
    const res = await PATCH(makeMockRequest({ method: 'PATCH', jsonBody: { chatId: 'c1', title: 'A'.repeat(201) } }));
    expect(res.status).toBe(400);
    expect(prismaMock.chat.update).not.toHaveBeenCalled();
  });
});

describe('KONFIGURASI LAYANAN EKSTERNAL', () => {
  test('S-MAIL-01: SMTP port 587 wajib STARTTLS (requireTLS)', async () => {
    jest.resetModules();
    process.env.SMTP_PORT = '587';
    const createTransport = jest.fn().mockReturnValue({ verify: jest.fn(), sendMail: jest.fn() });
    jest.doMock('nodemailer', () => ({ __esModule: true, default: { createTransport, getTestMessageUrl: jest.fn() } }));
    await import('@/lib/email');
    const opts = createTransport.mock.calls[0][0];
    expect(opts.requireTLS).toBe(true);
    expect(opts.secure).toBe(false);
  });

  test('S-MID-01: Midtrans default sandbox; production hanya jika env MIDTRANS_IS_PRODUCTION=true', async () => {
    const Snap = jest.fn();
    jest.doMock('midtrans-client', () => ({ __esModule: true, default: { Snap } }));

    delete process.env.MIDTRANS_IS_PRODUCTION;
    await loadRouteWithMocks('@/app/api/payment/checkout/route.js', { prismaMock: {} });
    expect(Snap.mock.calls.at(-1)[0].isProduction).toBe(false);

    process.env.MIDTRANS_IS_PRODUCTION = 'true';
    await loadRouteWithMocks('@/app/api/payment/checkout/route.js', { prismaMock: {} });
    expect(Snap.mock.calls.at(-1)[0].isProduction).toBe(true);
    delete process.env.MIDTRANS_IS_PRODUCTION;
  });
});

describe('PRIVASI DASHBOARD', () => {
  test('S-DSH-01: isu terkini di dashboard user tidak menyertakan createdBy (ID akun admin)', async () => {
    const prismaMock = {
      user: { count: jest.fn().mockResolvedValue(1) },
      chatHistory: { count: jest.fn().mockResolvedValue(0) },
      regulation: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      searchLog: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      trendingIssue: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const { GET } = await loadRouteWithMocks('@/app/api/dashboard/route.js', { prismaMock, authSession: { userId: 'u1' } });
    const res = await GET();
    expect(res.status).toBe(200);
    const args = prismaMock.trendingIssue.findMany.mock.calls[0][0];
    expect(args.select).toBeDefined();
    expect(args.select.createdBy).toBeUndefined();
  });
});
