import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

// ─────────────────────────────────────────────────────────────────────────────
// Unit Tests: GET /api/regulations/resolve
// Mencocokkan judul kutipan AI → link dokumen (untuk referensi yang bisa diklik)
// ─────────────────────────────────────────────────────────────────────────────

const baseRoute = '@/app/api/regulations/resolve/route.js';
const url = (titles) =>
  'http://localhost/api/regulations/resolve?' + titles.map((t) => 'title=' + encodeURIComponent(t)).join('&');

describe('GET /api/regulations/resolve', () => {
  test('TC-RES-01: judul cocok (tanpa peduli huruf besar/kecil) → mengembalikan fileUrl', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'r1', title: 'Regulasi Perdata - PP NO 4 TH 1977', fileUrl: 'https://pub-x.r2.dev/PP_NO_4.pdf' },
        ]),
      },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });
    const res = await GET(makeMockRequest({ url: url(['regulasi perdata - pp no 4 th 1977']) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data['regulasi perdata - pp no 4 th 1977'].fileUrl).toBe('https://pub-x.r2.dev/PP_NO_4.pdf');
  });

  test('TC-RES-05: judul tanpa awalan kategori tetap cocok (AI menulis "PERDA 10 TH 2023")', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'r9', title: 'Regulasi Ketenagakerjaan - PERDA 10 TH 2023', fileUrl: 'https://pub-x.r2.dev/perda10.pdf' },
        ]),
      },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });
    const body = await (await GET(makeMockRequest({ url: url(['PERDA 10 TH 2023']) }))).json();
    expect(body.data['perda 10 th 2023'].fileUrl).toBe('https://pub-x.r2.dev/perda10.pdf');
  });

  test('TC-RES-06: kecocokan persis diutamakan di atas kecocokan akhiran', async () => {
    const prismaMock = {
      regulation: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'suffix', title: 'Regulasi Perdata - PP 1', fileUrl: 'https://x.r2.dev/suffix.pdf' },
          { id: 'exact', title: 'PP 1', fileUrl: 'https://x.r2.dev/exact.pdf' },
        ]),
      },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });
    const body = await (await GET(makeMockRequest({ url: url(['PP 1']) }))).json();
    expect(body.data['pp 1'].id).toBe('exact');
  });

  test('TC-RES-02: [SECURITY] hanya dokumen aktif & field publik yang diambil', async () => {
    const prismaMock = { regulation: { findMany: jest.fn().mockResolvedValue([]) } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });
    await GET(makeMockRequest({ url: url(['A']) }));
    const args = prismaMock.regulation.findMany.mock.calls[0][0];
    expect(args.where.isActive).toBe(true);
    expect(args.select).toEqual({ id: true, title: true, fileUrl: true });
  });

  test('TC-RES-03: [SECURITY] fileUrl berbahaya (javascript:) tidak dikembalikan', async () => {
    const prismaMock = {
      regulation: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', title: 'Bad', fileUrl: 'javascript:alert(1)' }]) },
    };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });
    const body = await (await GET(makeMockRequest({ url: url(['Bad']) }))).json();
    expect(body.data).toEqual({});
  });

  test('TC-RES-04: [SECURITY] maksimal 20 judul per request, tanpa judul → tidak query DB', async () => {
    const prismaMock = { regulation: { findMany: jest.fn().mockResolvedValue([]) } };
    const { GET } = await loadRouteWithMocks(baseRoute, { prismaMock });

    await GET(makeMockRequest({ url: url(Array.from({ length: 50 }, (_, i) => `Judul ${i}`)) }));
    // 20 judul × 2 kondisi (persis + akhiran " - judul")
    expect(prismaMock.regulation.findMany.mock.calls[0][0].where.OR).toHaveLength(40);

    const empty = await GET(makeMockRequest({ url: 'http://localhost/api/regulations/resolve' }));
    expect((await empty.json()).data).toEqual({});
    expect(prismaMock.regulation.findMany).toHaveBeenCalledTimes(1);
  });
});
