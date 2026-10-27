// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: router model (urutan fallback, cooldown, klasifikasi error, timeout)
// ─────────────────────────────────────────────────────────────────────────────

describe('lib/modelRouter', () => {
  let r;
  const env = { GROQ_API_KEY: 'gsk_test' };
  beforeAll(async () => {
    r = await import('@/lib/modelRouter');
  });
  beforeEach(() => {
    r.clearCooldowns();
    r.clearRateLimitSnapshots();
  });

  test('TC-ROUTE-01: mode pilihan pengguna selalu dicoba pertama', () => {
    for (const mode of r.CHAT_MODES) {
      expect(r.buildModelChain(mode, { env })[0].mode).toBe(mode);
    }
  });

  test('TC-ROUTE-02: tiap model hanya muncul sekali; semua model penyedia ikut sebagai cadangan', () => {
    const chain = r.buildModelChain('qwen', { env });
    const models = chain.map((c) => c.model);
    expect(new Set(models).size).toBe(models.length);
    expect(models).toHaveLength(5);
    expect(chain.some((c) => c.provider === 'gemini')).toBe(true);
  });

  test('TC-ROUTE-03: cadangan dengan jenis mode yang sama (Kilat/Berpikir) didahulukan, mengikuti prioritas Ragas', () => {
    const chain = r.buildModelChain('lite', { env });
    const kilat = r.modePriority(env).filter((m) => !r.MODE_CONFIG[m].thinking);
    const expectedFirstFallback = kilat.find((m) => r.MODE_CONFIG[m].model !== r.MODE_CONFIG.lite.model);
    expect(chain[1].mode).toBe(expectedFirstFallback);
    expect(chain[1].thinking).toBe(false);
  });

  test('TC-ROUTE-04: tanpa GROQ_API_KEY, model Groq tidak masuk rantai', () => {
    const chain = r.buildModelChain('gptoss', { env: {} });
    expect(chain.every((c) => c.provider === 'gemini')).toBe(true);
    expect(chain).toHaveLength(3);
  });

  test('TC-ROUTE-05: model yang sedang cooldown dipindah ke urutan terakhir (tetap dicoba bila lain gagal)', () => {
    const now = 1_000_000;
    r.markCooldown('gemini-3.5-flash-lite', 60_000, 'limit', now);
    const chain = r.buildModelChain('lite', { env, now });
    expect(chain[0].model).not.toBe('gemini-3.5-flash-lite');
    expect(chain.at(-1)).toMatchObject({ model: 'gemini-3.5-flash-lite', coolingDown: true });
    // setelah waktu cooldown lewat, kembali normal
    expect(r.buildModelChain('lite', { env, now: now + 61_000 })[0].model).toBe('gemini-3.5-flash-lite');
  });

  test('TC-ROUTE-06: MODEL_PRIORITY di env bisa mengubah urutan tanpa mengubah kode', () => {
    expect(r.modePriority({ MODEL_PRIORITY: 'qwen,bukan-mode,gptoss' }).slice(0, 2)).toEqual(['qwen', 'gptoss']);
    expect(r.buildModelChain('fast', { env: { ...env, MODEL_PRIORITY: 'qwen' } })[1].mode).toBe('qwen');
  });

  test.each([
    [{ status: 429, message: 'Too Many Requests' }, 'limit'],
    [{ status: 413, message: 'Groq 413: Request too large for model, tokens per minute (TPM)' }, 'limit'],
    [{ message: '[GoogleGenerativeAI Error]: [429] You exceeded your current quota' }, 'limit'],
    [{ status: 503, message: 'The model is overloaded' }, 'transient'],
    [{ message: '[GoogleGenerativeAI Error]: Failed to parse stream' }, 'transient'],
    [{ message: 'fetch failed' }, 'transient'],
    [{ status: 401, message: 'Invalid API Key' }, 'auth'],
    [{ status: 400, message: 'Invalid argument' }, 'bad_request'],
    [{ timeout: true, message: 'Model tidak merespons dalam 45 detik' }, 'timeout'],
    [{ emptyResponse: true, message: 'Model selesai tanpa teks jawaban' }, 'empty'],
    [{ name: 'AbortError', message: 'This operation was aborted' }, 'aborted'],
    [{ message: 'sesuatu yang aneh' }, 'unknown'],
  ])('TC-ROUTE-07: klasifikasi error %o → %s', (err, kind) => {
    const c = r.classifyModelError(err);
    expect(c.kind).toBe(kind);
    expect(c.fallback).toBe(kind !== 'aborted'); // Stop pengguna tidak boleh memicu fallback
  });

  test('TC-ROUTE-08: lama cooldown memakai "retry in" dari penyedia; kuota harian lebih lama', () => {
    expect(r.classifyModelError({ status: 429, message: 'Please retry in 23.4s.' }).cooldownMs).toBe(23_400);
    expect(r.classifyModelError({ status: 429, message: 'quota', retryAfterMs: 5000 }).cooldownMs).toBe(5000);
    expect(r.classifyModelError({ status: 429, message: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }).cooldownMs).toBe(15 * 60_000);
  });

  test('TC-ROUTE-09: stream yang diam terlalu lama dihentikan dengan error timeout', async () => {
    let aborted = false;
    async function* slow() {
      yield 'a';
      await new Promise((res) => setTimeout(res, 200));
      yield 'b';
    }
    const out = [];
    await expect((async () => {
      for await (const x of r.withStreamTimeouts(slow(), { firstChunkMs: 100, stallMs: 50, onTimeout: () => { aborted = true; } })) out.push(x);
    })()).rejects.toMatchObject({ timeout: true });
    expect(out).toEqual(['a']);
    expect(aborted).toBe(true);
  });

  test('TC-ROUTE-10: stream normal tidak terganggu batas waktu', async () => {
    async function* fast() { yield 1; yield 2; yield 3; }
    const out = [];
    for await (const x of r.withStreamTimeouts(fast(), { firstChunkMs: 100, stallMs: 100 })) out.push(x);
    expect(out).toEqual([1, 2, 3]);
  });

  test('TC-ROUTE-11: header batas Groq dicatat sebagai snapshot; header kosong diabaikan', () => {
    const headers = new Map(Object.entries({
      'x-ratelimit-limit-requests': '1000', 'x-ratelimit-remaining-requests': '987',
      'x-ratelimit-limit-tokens': '8000', 'x-ratelimit-remaining-tokens': '5200', 'x-ratelimit-reset-tokens': '21s',
    }));
    r.recordRateLimitHeaders('qwen/qwen3.8-27b', headers, 42);
    expect(r.rateLimitSnapshot('qwen/qwen3.8-27b')).toMatchObject({ remainingRequests: 987, limitTokens: 8000, remainingTokens: 5200, resetTokens: '21s', observedAt: 42 });
    r.recordRateLimitHeaders('openai/gpt-oss-120b', new Map());
    expect(r.rateLimitSnapshot('openai/gpt-oss-120b')).toBeNull();
  });

  // ── Batas harian (cooldown sampai kuota pulih, peringatan ≥ 70%) ──
  test('TC-ROUTE-LIM-01: kuota harian Gemini habis → cooldown sampai tengah malam Pasifik walau disarankan retry 30 dtk', () => {
    const now = Date.parse('2026-10-27T05:00:00Z'); // 22.00 PDT → 2 jam lagi
    const info = r.classifyModelError({ status: 429, message: 'quota_id: GenerateRequestsPerDayPerProjectPerModel-FreeTier. Please retry in 30s.' }, { provider: 'gemini', now });
    expect(info).toMatchObject({ kind: 'limit', daily: true, fallback: true, cooldownMs: 2 * 3600_000 });
    expect(r.msUntilPacificMidnight(Date.parse('2026-12-01T08:00:00Z'))).toBe(24 * 3600_000); // tepat tengah malam PST
  });

  test('TC-ROUTE-LIM-02: batas Groq memakai sisa waktu dari pesan (format 7m12.5s / 500ms / 1h2m3s)', () => {
    expect(r.classifyModelError({ status: 429, message: 'Rate limit reached ... tokens per day (TPD). Please try again in 7m12.5s.' }, { provider: 'groq' }))
      .toMatchObject({ daily: true, cooldownMs: 432_500 });
    expect(r.classifyModelError({ status: 429, message: 'tokens per minute (TPM). Please try again in 500ms.' }, { provider: 'groq' }).cooldownMs).toBe(500);
    expect(r.classifyModelError({ status: 429, message: 'Please try again in 1h2m3s' }, { provider: 'groq' }).cooldownMs).toBe(3_723_000);
    expect(r.classifyModelError({ status: 429, message: 'per minute. Please retry in 9.1s' }).daily).toBeUndefined();
  });

  test('TC-ROUTE-LIM-03: pemakaian harian — Groq aktual dari header (segar), Gemini estimasi hanya bila batasnya diisi', () => {
    const now = 1_000_000_000;
    expect(r.dailyUsageLevel({ provider: 'groq', snapshot: { limitRequests: 1000, remainingRequests: 280, observedAt: now - 60_000 }, now }))
      .toEqual({ used: 720, limit: 1000, source: 'aktual', percent: 72, warning: true });
    expect(r.dailyUsageLevel({ provider: 'groq', snapshot: { limitRequests: 1000, remainingRequests: 280, observedAt: now - 2 * 3600_000 }, now })).toBeNull();
    expect(r.dailyUsageLevel({ provider: 'gemini', used: 13, limit: 20 })).toMatchObject({ percent: 65, warning: false, source: 'estimasi' });
    expect(r.dailyUsageLevel({ provider: 'gemini', used: 14, limit: 20 })).toMatchObject({ percent: 70, warning: true });
    expect(r.dailyUsageLevel({ provider: 'gemini', used: 13 })).toBeNull();
    expect([...r.geminiDailyLimits({ GEMINI_DAILY_LIMITS: 'gemini-3.6-flash=20, gemini-3.5-flash=x,salah' })]).toEqual([['gemini-3.6-flash', 20]]);
  });
});
