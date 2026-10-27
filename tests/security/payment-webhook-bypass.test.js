import { makeMockRequest } from '@/tests/utils/mockRequest';
import { loadRouteWithMocks } from '@/tests/utils/loadRouteWithMocks';

describe('POST /api/payment/webhook', () => {
  test('SECURITY: sandbox bypass processes even with invalid signature when not production', async () => {
    process.env.NODE_ENV = 'test';
    process.env.MIDTRANS_SERVER_KEY = 'SB-Mid-server-xxx';

    const prismaMock = {
      transaction: {
        findUnique: jest.fn().mockResolvedValue({ orderId: 'ORDER-1', status: 'PENDING', userId: 'U1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        // Webhook membaca tanggal berakhir PRO saat ini (perpanjangan 30 hari)
        findUnique: jest.fn().mockResolvedValue({ tier: 'FREE', proExpiresAt: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const { POST } = await loadRouteWithMocks('@/app/api/payment/webhook/route.js', { prismaMock });

    const req = makeMockRequest({
      method: 'POST',
      jsonBody: {
        order_id: 'ORDER-1',
        transaction_status: 'settlement',
        fraud_status: 'accept',
        status_code: '200',
        gross_amount: '49900.00',
        signature_key: 'definitely-not-valid',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Evidence: despite signature mismatch, it should attempt to upgrade in non-production.
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'U1' }, data: expect.objectContaining({ tier: 'PRO' }) })
    );
  });
});

