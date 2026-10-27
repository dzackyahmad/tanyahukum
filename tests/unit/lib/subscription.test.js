// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: paket langganan (PRO 30 hari)
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/subscription', () => {
  let s;
  const now = new Date('2026-10-27T10:00:00Z');
  const days = (n) => new Date(now.getTime() + n * 86_400_000);
  beforeAll(async () => {
    s = await import('@/lib/subscription');
  });

  test('TC-SUB-01: pembayaran pertama → PRO 30 hari dari sekarang', () => {
    expect(s.proExpiryAfterPayment({ tier: 'FREE' }, now)).toEqual(days(30));
  });

  test('TC-SUB-02: perpanjangan saat masih aktif menambah 30 hari dari tanggal berakhir, bukan dari hari ini', () => {
    expect(s.proExpiryAfterPayment({ tier: 'PRO', proExpiresAt: days(5) }, now)).toEqual(days(35));
  });

  test('TC-SUB-03: membeli lagi setelah berakhir → 30 hari dari sekarang', () => {
    expect(s.proExpiryAfterPayment({ tier: 'PRO', proExpiresAt: days(-3) }, now)).toEqual(days(30));
  });

  test('TC-SUB-04: status paket efektif', () => {
    expect(s.effectivePlan({ tier: 'PRO', proExpiresAt: days(10) }, now)).toMatchObject({ tier: 'PRO', status: 'aktif', noExpiry: false });
    expect(s.effectivePlan({ tier: 'PRO', proExpiresAt: null }, now)).toMatchObject({ tier: 'PRO', status: 'aktif', noExpiry: true });
    expect(s.effectivePlan({ tier: 'PRO', proExpiresAt: days(-1) }, now)).toMatchObject({ tier: 'FREE', status: 'berakhir', expired: true });
    expect(s.effectivePlan({ tier: 'FREE' }, now)).toMatchObject({ tier: 'FREE', status: 'gratis', expired: false });
  });

  test('TC-SUB-05: batas harian — PRO tanpa batas, PRO berakhir kembali 10, batas FREE dari admin (termasuk 0) dihormati', () => {
    expect(s.dailyLimitFor({ tier: 'PRO', promptLimit: 0, proExpiresAt: days(1) }, now)).toBeNull();
    expect(s.dailyLimitFor({ tier: 'PRO', promptLimit: 0, proExpiresAt: days(-1) }, now)).toBe(s.FREE_PROMPT_LIMIT);
    expect(s.dailyLimitFor({ tier: 'FREE', promptLimit: 10 }, now)).toBe(10);
    expect(s.dailyLimitFor({ tier: 'FREE', promptLimit: 0 }, now)).toBe(0);
  });

  test('TC-SUB-06: PRO berakhir diturunkan ke FREE dengan kondisi aman; yang masih aktif tidak disentuh', async () => {
    const prisma = { user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    expect(await s.downgradeIfExpired(prisma, { id: 'u1', tier: 'PRO', proExpiresAt: days(-1) }, now)).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', tier: 'PRO', proExpiresAt: { lte: now } },
      data: { tier: 'FREE', promptLimit: 10 },
    });
    prisma.user.updateMany.mockClear();
    expect(await s.downgradeIfExpired(prisma, { id: 'u2', tier: 'PRO', proExpiresAt: days(3) }, now)).toBe(false);
    expect(await s.downgradeIfExpired(prisma, { id: 'u3', tier: 'PRO', proExpiresAt: null }, now)).toBe(false);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  test('TC-SUB-07: hari kuota mulai tengah malam waktu server dan reset 24 jam kemudian', () => {
    const start = s.startOfQuotaDay(now);
    expect(start.getHours()).toBe(0);
    expect(s.nextQuotaReset(now).getTime() - start.getTime()).toBe(86_400_000);
  });

  test('TC-SUB-QUOTA-01: status kuota — peringatan mulai 70%, PRO tanpa batas → null', () => {
    expect(s.quotaStatus(6, 10, now)).toMatchObject({ used: 6, limit: 10, remaining: 4, warning: false });
    expect(s.quotaStatus(7, 10, now)).toMatchObject({ remaining: 3, warning: true, resetsAt: s.nextQuotaReset(now).toISOString() });
    expect(s.quotaStatus(12, 10, now)).toMatchObject({ remaining: 0, warning: true });
    expect(s.quotaStatus(3, null, now)).toBeNull();
  });
});
