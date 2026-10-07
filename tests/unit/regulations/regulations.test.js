import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: GET /api/regulations
// Cakupan: pagination, search, category filter, sort, empty result, search log
// ─────────────────────────────────────────────────────────────────────────────

const baseRoute = '@/app/api/regulations/route.js';

const sampleRegulations = [
  { id: 'r1', title: 'UU Ketenagakerjaan', description: 'Tentang tenaga kerja', category: 'Ketenagakerjaan', fileSize: 1024, isProcessed: true, fileUrl: 'https://example.com/doc1.pdf', createdAt: new Date(), viewCount: 100 },
  { id: 'r2', title: 'PP Waralaba', description: 'Tentang waralaba', category: 'Perdagangan', fileSize: 2048, isProcessed: true, fileUrl: 'https://example.com/doc2.pdf', createdAt: new Date(), viewCount: 50 },
];

describe('GET /api/regulations', () => {
  // ── HAPPY PATH ──────────────────────────────────────────────────────────────
  test('TC-REG-01: returns paginated list with meta on default request', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue(sampleRegulations),
        count: jest.fn().mockResolvedValue(2),
      },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?page=1&limit=10' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta).toMatchObject({ currentPage: 1, dataPerPage: 10, totalData: 2 });
  });

  // ── SEARCH ───────────────────────────────────────────────────────────────────
  test('TC-REG-02: passes correct search where clause for title & description', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([sampleRegulations[0]]),
        count: jest.fn().mockResolvedValue(1),
      },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?search=ketenagakerjaan' });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.where.OR).toBeDefined();
    expect(findManyCall.where.OR[0].title.contains).toBe('ketenagakerjaan');
    expect(findManyCall.where.OR[0].title.mode).toBe('insensitive');
  });

  test('TC-REG-03: returns empty data array (not error) for search with no results', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?search=xxxxxxnotfound' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
    expect(body.meta.totalData).toBe(0);
    expect(body.meta.totalPages).toBe(0);
  });

  // ── CATEGORY FILTER ──────────────────────────────────────────────────────────
  test('TC-REG-04: applies category filter when category param is not "Semua"', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([sampleRegulations[0]]),
        count: jest.fn().mockResolvedValue(1),
      },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?category=Ketenagakerjaan' });
    const res = await GET(req);
    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.where.category).toBe('Ketenagakerjaan');
  });

  test('TC-REG-05: does NOT apply category filter when category is "Semua"', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue(sampleRegulations),
        count: jest.fn().mockResolvedValue(2),
      },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?category=Semua' });
    await GET(req);
    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.where.category).toBeUndefined();
  });

  // ── PAGINATION ───────────────────────────────────────────────────────────────
  test('TC-REG-06: calculates skip correctly for page > 1', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(25) },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?page=3&limit=5' });
    await GET(req);
    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.skip).toBe(10); // (3-1) * 5
    expect(findManyCall.take).toBe(5);
  });

  test('TC-REG-07: always filters isActive=true for public endpoint', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations' });
    await GET(req);
    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.where.isActive).toBe(true);
  });

  // ── SEARCH LOG ───────────────────────────────────────────────────────────────
  test('TC-REG-08: logs search query to SearchLog when search param present', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      searchLog: { create: jest.fn().mockResolvedValue({}) },
    };
    // userId kini diambil dari sesi login, bukan dari query param
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: { userId: 'u1' } });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?search=tenaga+kerja&userId=spoofed' });
    await GET(req);

    // Wait for async fire-and-forget log
    await new Promise(r => setTimeout(r, 50));
    expect(prismaMock.searchLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ query: 'tenaga kerja', userId: 'u1' }) })
    );
  });

  test('TC-REG-10: [SECURITY] sortBy tidak dikenal diabaikan (fallback ke title)', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      searchLog: { create: jest.fn() },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock, authSession: null });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations?sortBy=content&order=DROP' });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const findManyCall = prismaMock.regulation.findMany.mock.calls[0]?.[0];
    expect(findManyCall.orderBy).toEqual({ title: 'asc' });
  });

  test('TC-REG-09: does NOT log search when search param is empty', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      searchLog: { create: jest.fn() },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    const req = makeMockRequest({ url: 'http://localhost/api/regulations' });
    await GET(req);
    await new Promise(r => setTimeout(r, 50));
    expect(prismaMock.searchLog.create).not.toHaveBeenCalled();
  });
});
