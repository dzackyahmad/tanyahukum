/**
 * Load a Next.js route handler module after applying jest mocks.
 * Use dynamic import so mocks are applied before module evaluation.
 *
 * @param {string} routePath  - Module path alias, e.g. '@/app/api/chat/route.js'
 * @param {object} options
 * @param {object} [options.prismaMock]   - Prisma client mock
 * @param {object|null} [options.authSession] - Value returned by getSession().
 *   Pass an object like { userId, role } to simulate a logged-in user.
 *   Pass null to simulate no session (unauthenticated).
 *   Omit to leave @/lib/auth unmocked (default behaviour).
 */
export async function loadRouteWithMocks(routePath, { prismaMock, authSession } = {}) {
  jest.resetModules();

  if (prismaMock) {
    // Kuota harian kini dihitung dari tabel PromptUsage. Test lama mengatur jumlah pemakaian
    // lewat chatHistory.count, jadi jika promptUsage tidak di-mock, nilai itu dipakai ulang.
    if (prismaMock.chatHistory && !prismaMock.promptUsage) {
      prismaMock.promptUsage = {
        count: prismaMock.chatHistory.count || jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
      };
    }
    jest.doMock('@/lib/prisma', () => ({
      __esModule: true,
      default: prismaMock,
    }));
  }

  if (authSession !== undefined) {
    jest.doMock('@/lib/auth', () => ({
      __esModule: true,
      getSession: jest.fn().mockResolvedValue(authSession),
      createToken: jest.fn().mockResolvedValue('mock-token'),
    }));
  }

  return await import(routePath);
}
