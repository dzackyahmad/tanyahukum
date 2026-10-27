// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: status model bersama antar instance server (tabel ModelStatus)
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/modelStatus', () => {
  let ms;
  let router;
  beforeAll(async () => {
    ms = await import('@/lib/modelStatus');
    router = await import('@/lib/modelRouter');
  });
  beforeEach(() => router.clearCooldowns());

  test('TC-MSTAT-01: cooldown dari tabel disalin ke memori instance ini (dengan alasannya)', async () => {
    const now = Date.now();
    const prisma = { modelStatus: { findMany: jest.fn().mockResolvedValue([
      { model: 'gemini-3.5-flash', cooldownUntil: new Date(now + 600_000), cooldownReason: 'limit_daily' },
    ]) } };
    expect(await ms.syncCooldowns(prisma, { now })).toBe(1);
    expect(router.cooldownOf('gemini-3.5-flash', now + 1000)).toMatchObject({ until: now + 600_000, reason: 'limit_daily' });
    expect(prisma.modelStatus.findMany.mock.calls[0][0].where.cooldownUntil.gt.getTime()).toBe(now);
  });

  test('TC-MSTAT-02: database lambat atau error → dilewati tanpa melempar error', async () => {
    const slow = { modelStatus: { findMany: jest.fn(() => new Promise(() => {})) } };
    expect(await ms.syncCooldowns(slow, { timeoutMs: 20 })).toBe(0);
    const broken = { modelStatus: { findMany: jest.fn().mockRejectedValue(new Error('down')) } };
    expect(await ms.syncCooldowns(broken)).toBe(0);
    expect(router.cooldownOf('gemini-3.5-flash')).toBeNull();
  });

  test('TC-MSTAT-03: jawaban per model Gemini dihitung sejak kuota pulih (tengah malam Pasifik), semua pengguna', async () => {
    const now = Date.parse('2026-10-27T05:00:00Z'); // 22.00 PDT → hari kuota mulai 07.00 UTC kemarin
    const prisma = { promptUsage: { groupBy: jest.fn().mockResolvedValue([{ model: 'gemini-3.6-flash', _count: { _all: 9 } }]) } };
    const counts = await ms.geminiAnswersToday(prisma, ['gemini-3.6-flash'], { now });
    expect(counts.get('gemini-3.6-flash')).toBe(9);
    const where = prisma.promptUsage.groupBy.mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe('2026-10-26T07:00:00.000Z');
    expect(where).not.toHaveProperty('userId');
    expect(await ms.geminiAnswersToday(prisma, [])).toEqual(new Map());
  });
});
