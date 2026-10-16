// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: lib/rateLimit.js (jendela tetap 1 menit per scope)
// ─────────────────────────────────────────────────────────────────────────────

describe('rateLimit', () => {
  let rateLimit;

  // Satu jam palsu untuk seluruh file: lru-cache menyimpan referensi jam saat modul dimuat.
  // Setiap test memakai ID pengguna sendiri agar bucket tidak saling memengaruhi.
  beforeAll(async () => {
    jest.useFakeTimers({ now: new Date('2026-10-16T00:00:00Z') });
    jest.advanceTimersByTime(1000); // performance.now() palsu mulai dari 0; lru-cache menganggap 0 = tanpa TTL
    ({ rateLimit } = await import('@/lib/rateLimit'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('TC-RL-01: menolak request ke-(N+1) dalam satu menit', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('u1', 3, 'chat')).toBe(true);
    expect(rateLimit('u1', 3, 'chat')).toBe(false);
  });

  test('TC-RL-02: bucket terpisah per scope & per pengguna', () => {
    for (let i = 0; i < 3; i++) rateLimit('u20', 3, 'chat');
    expect(rateLimit('u20', 3, 'login')).toBe(true);
    expect(rateLimit('u21', 3, 'chat')).toBe(true);
  });

  test('TC-RL-03: [BUG FIX] jendela di-reset 1 menit sejak request pertama walau pengguna terus aktif', () => {
    // Pengguna mengirim request setiap 20 detik (tidak pernah diam 1 menit penuh)
    expect(rateLimit('u3', 3, 'chat')).toBe(true);  // t=0
    jest.advanceTimersByTime(20_000);
    expect(rateLimit('u3', 3, 'chat')).toBe(true);  // t=20
    jest.advanceTimersByTime(20_000);
    expect(rateLimit('u3', 3, 'chat')).toBe(true);  // t=40
    jest.advanceTimersByTime(21_000);
    // t=61: jendela pertama sudah habis → kuota per menit kembali tersedia
    // (sebelum perbaikan: TTL diperpanjang tiap request → tetap ditolak)
    expect(rateLimit('u3', 3, 'chat')).toBe(true);
  });
});
