import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: GET /api/usage (Profil › Penggunaan)
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;

function makePrisma({ user, today = [], month = [], payment = null, statuses = [] } = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    promptUsage: {
      groupBy: jest.fn().mockImplementation(({ _sum }) => Promise.resolve(_sum ? month : today)),
    },
    transaction: { findFirst: jest.fn().mockResolvedValue(payment) },
    modelStatus: { findMany: jest.fn().mockResolvedValue(statuses) },
  };
}

async function callUsage(prismaMock, session = { userId: 'user-1' }) {
  const { GET } = await loadRouteWithMocks('@/app/api/usage/route.js', { prismaMock, authSession: session });
  const res = await GET();
  return { status: res.status, body: await res.json(), prismaMock };
}

describe('GET /api/usage', () => {
  beforeEach(() => { process.env.GROQ_API_KEY = 'test-groq-key'; });
  afterEach(() => { delete process.env.GROQ_API_KEY; });

  test('TC-USAGE-01: tanpa login → 401', async () => {
    const { status } = await callUsage(makePrisma(), null);
    expect(status).toBe(401);
  });

  test('TC-USAGE-02: hanya data milik pengguna yang login yang diambil', async () => {
    const prisma = makePrisma({ user: { id: 'user-1', tier: 'FREE', promptLimit: 50, proExpiresAt: null } });
    await callUsage(prisma);
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: 'user-1' });
    for (const [args] of prisma.promptUsage.groupBy.mock.calls) expect(args.where.userId).toBe('user-1');
    expect(prisma.transaction.findFirst.mock.calls[0][0].where).toMatchObject({ userId: 'user-1', status: 'SUCCESS' });
  });

  test('TC-USAGE-03: FREE — sisa kuota, pemakaian per model, dan pemakaian lama tanpa nama model', async () => {
    const prisma = makePrisma({
      user: { id: 'user-1', tier: 'FREE', promptLimit: 50, proExpiresAt: null },
      today: [{ model: 'gemini-3.5-flash-lite', _count: { _all: 3 } }, { model: null, _count: { _all: 2 } }],
      month: [
        { model: 'gemini-3.5-flash-lite', _count: { _all: 10 }, _sum: { inputTokens: 50000, outputTokens: 4000 } },
        { model: null, _count: { _all: 7 }, _sum: { inputTokens: null, outputTokens: null } },
      ],
    });
    const { status, body } = await callUsage(prisma);
    expect(status).toBe(200);
    expect(body.quota).toMatchObject({ used: 5, limit: 50, remaining: 45 });
    expect(body.plan).toMatchObject({ tier: 'FREE', name: 'Basic', status: 'gratis' });
    const lite = body.models.find((m) => m.model === 'gemini-3.5-flash-lite');
    expect(lite).toMatchObject({ name: 'Gemini 3.5 Flash-Lite', today: 3, last30Days: 10, inputTokens: 50000, outputTokens: 4000 });
    expect(body.untracked).toEqual({ today: 2, last30Days: 7 });
  });

  test('TC-USAGE-04: PRO aktif — tanpa batas harian, tanggal berakhir tampil', async () => {
    const expires = new Date(Date.now() + 10 * DAY);
    const prisma = makePrisma({
      user: { id: 'user-1', tier: 'PRO', promptLimit: 0, proExpiresAt: expires },
      payment: { updatedAt: new Date(Date.now() - 20 * DAY), amount: 49900 },
    });
    const { body } = await callUsage(prisma);
    expect(body.plan).toMatchObject({ tier: 'PRO', status: 'aktif', noExpiry: false, expiresAt: expires.toISOString(), durationDays: 30 });
    expect(body.plan.lastPaymentAt).not.toBeNull();
    expect(body.quota).toMatchObject({ limit: null, remaining: null });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  test('TC-USAGE-05: PRO yang sudah berakhir → diperlakukan FREE (batas 10) dan diturunkan di database', async () => {
    const prisma = makePrisma({ user: { id: 'user-1', tier: 'PRO', promptLimit: 0, proExpiresAt: new Date(Date.now() - DAY) } });
    const { body } = await callUsage(prisma);
    expect(body.plan).toMatchObject({ tier: 'FREE', status: 'berakhir' });
    expect(body.quota.limit).toBe(10);
    expect(prisma.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'user-1', tier: 'PRO' }),
      data: { tier: 'FREE', promptLimit: 10 },
    }));
  });

  test('TC-USAGE-06: PRO lama tanpa tanggal berakhir tetap aktif dan tidak diubah', async () => {
    const prisma = makePrisma({ user: { id: 'user-1', tier: 'PRO', promptLimit: 0, proExpiresAt: null } });
    const { body } = await callUsage(prisma);
    expect(body.plan).toMatchObject({ tier: 'PRO', status: 'aktif', noExpiry: true, expiresAt: null });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  test('TC-USAGE-07: status model dari tabel bersama — cooldown & sisa batas Groq (estimasi)', async () => {
    const observedAt = new Date();
    const prisma = makePrisma({
      user: { id: 'user-1', tier: 'FREE', promptLimit: 50, proExpiresAt: null },
      statuses: [
        { model: 'gemini-3.5-flash', provider: 'gemini', cooldownUntil: new Date(Date.now() + 60_000) },
        { model: 'qwen/qwen3.8-27b', provider: 'groq', remainingRequests: 990, limitRequests: 1000, remainingTokens: 6000, limitTokens: 8000, observedAt },
        { model: 'gemini-3.5-flash-lite', provider: 'gemini', cooldownUntil: new Date(Date.now() - 60_000) },
      ],
    });
    const { body } = await callUsage(prisma);
    const byModel = Object.fromEntries(body.availability.map((a) => [a.model, a]));
    expect(byModel['gemini-3.5-flash'].status).toBe('dibatasi');
    expect(byModel['gemini-3.5-flash-lite'].status).toBe('tersedia'); // cooldown sudah lewat
    expect(byModel['qwen/qwen3.8-27b'].rateLimit).toMatchObject({ remainingRequests: 990, remainingTokens: 6000 });
    expect(byModel['gemini-3.5-flash'].rateLimit).toBeNull(); // Gemini tidak menyediakan sisa kuota
  });

  test('TC-USAGE-08: kegagalan database → 500 tanpa membocorkan pesan error', async () => {
    const prisma = makePrisma({ user: { id: 'user-1', tier: 'FREE', promptLimit: 50 } });
    prisma.promptUsage.groupBy.mockRejectedValue(new Error('connection refused at db.internal:5432'));
    const { status, body } = await callUsage(prisma);
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('db.internal');
  });

  test('TC-USAGE-09: status model memuat alasan cooldown & pemakaian harian (Groq aktual, Gemini estimasi dari env)', async () => {
    process.env.GEMINI_DAILY_LIMITS = 'gemini-3.6-flash=20';
    try {
      const now = Date.now();
      const prisma = makePrisma({
        user: { id: 'user-1', tier: 'FREE', promptLimit: 10, proExpiresAt: null },
        statuses: [
          { model: 'gemini-3.5-flash', cooldownUntil: new Date(now + 3600_000), cooldownReason: 'limit_daily' },
          { model: 'openai/gpt-oss-120b', limitRequests: 1000, remainingRequests: 250, limitTokens: 8000, remainingTokens: 7000, observedAt: new Date(now - 60_000) },
        ],
      });
      prisma.promptUsage.groupBy.mockImplementation((args) => Promise.resolve(
        args.where.model ? [{ model: 'gemini-3.6-flash', _count: { _all: 15 } }] : []
      ));
      const { body } = await callUsage(prisma);
      const byModel = Object.fromEntries(body.availability.map((a) => [a.model, a]));
      expect(byModel['gemini-3.5-flash']).toMatchObject({ status: 'dibatasi', cooldownReason: 'limit_daily' });
      expect(byModel['openai/gpt-oss-120b'].daily).toMatchObject({ percent: 75, warning: true, source: 'aktual' });
      expect(byModel['gemini-3.6-flash'].daily).toMatchObject({ used: 15, limit: 20, percent: 75, source: 'estimasi' });
      expect(byModel['gemini-3.5-flash-lite'].daily).toBeNull();
      expect(body.fallbackOrder[0]).toBe('next-fast'); // urutan Ragas untuk pindah otomatis di menu model
    } finally {
      delete process.env.GEMINI_DAILY_LIMITS;
    }
  });

  test('TC-USAGE-10: GROQ_API_KEY tidak diset di server → model Groq dikunci "tidak aktif" (tanpa waktu pulih)', async () => {
    delete process.env.GROQ_API_KEY;
    const { body } = await callUsage(makePrisma({ user: { id: 'user-1', tier: 'FREE', promptLimit: 10, proExpiresAt: null } }));
    const byModel = Object.fromEntries(body.availability.map((a) => [a.model, a]));
    expect(byModel['qwen/qwen3.8-27b']).toMatchObject({ status: 'dibatasi', cooldownReason: 'not_configured', cooldownUntil: null });
    expect(byModel['openai/gpt-oss-120b'].status).toBe('dibatasi');
    expect(byModel['gemini-3.6-flash'].status).toBe('tersedia');
  });
});
