// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: src/lib/processCache.js — proses jawaban AI tersimpan di browser
// ─────────────────────────────────────────────────────────────────────────────

const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const PROCESS = { steps: { search: 'done', think: 'done', write: 'done' }, thinking: 'Analisis...', done: true, durationMs: 4200 };

describe('processCache', () => {
  beforeEach(() => Object.keys(store).forEach((k) => delete store[k]));

  test('TC-PC-01: proses yang disimpan bisa diambil lagi dengan chatId & jawaban yang sama', async () => {
    const { saveProcess, getProcess } = await import('@/src/lib/processCache');
    saveProcess('chat-1', 'Jawaban A', PROCESS);
    expect(getProcess('chat-1', 'Jawaban A')).toEqual(PROCESS);
  });

  test('TC-PC-02: jawaban berbeda / chat berbeda tidak tertukar', async () => {
    const { saveProcess, getProcess } = await import('@/src/lib/processCache');
    saveProcess('chat-1', 'Jawaban A', PROCESS);
    expect(getProcess('chat-1', 'Jawaban B')).toBeNull();
    expect(getProcess('chat-2', 'Jawaban A')).toBeNull();
  });

  test('TC-PC-03: hanya menyimpan maksimal 50 proses terbaru', async () => {
    const { saveProcess } = await import('@/src/lib/processCache');
    for (let i = 0; i < 60; i++) saveProcess(`chat-${i}`, `Jawaban ${i}`, PROCESS);
    expect(Object.keys(JSON.parse(store.tanyahukum_process_cache))).toHaveLength(50);
  });

  test('TC-PC-04: [PRIVASI] clearProcessCache menghapus semua proses (dipanggil saat logout)', async () => {
    const { saveProcess, getProcess, clearProcessCache } = await import('@/src/lib/processCache');
    saveProcess('chat-1', 'Jawaban A', PROCESS);
    clearProcessCache();
    expect(getProcess('chat-1', 'Jawaban A')).toBeNull();
  });
});
