import { NextResponse } from "next/server";
import Midtrans from "midtrans-client";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const snap = new Midtrans.Snap({
  // Default sandbox (perilaku lama). Set MIDTRANS_IS_PRODUCTION=true saat go-live.
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export async function POST(req) {
  try {
    // Identitas selalu dari JWT cookie, bukan dari body (cegah IDOR)
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    // Body userId tetap diterima demi kompatibilitas frontend, tapi harus cocok dengan sesi
    const body = await req.json().catch(() => ({}));
    if (body?.userId && body.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Cari data User di Database untuk mengambil Email dan Tier-nya
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, tier: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Cek apakah user sudah PRO — tidak perlu bayar lagi
    if (user.tier === "PRO") {
      return NextResponse.json({ error: "Anda sudah berlangganan PRO." }, { status: 400 });
    }

    // 2. Definisikan Harga & Order ID
    const amount = 49900; 
    const orderId = `TRX-${Date.now()}-${userId.substring(0, 5)}`;

    // 3. Buat Transaksi di Database kita (Status PENDING)
    await prisma.transaction.create({
      data: {
        orderId: orderId,
        userId: userId,
        amount: amount,
        status: "PENDING",
      },
    });

    // 4. Request Snap Token ke Midtrans (DENGAN DETAIL LENGKAP)
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [{
        id: "PRO-TIER-1",
        price: amount,
        quantity: 1,
        name: "Langganan PRO TanyaHukum"
      }],
      customer_details: {
        email: user.email,
        // Anda bisa tambahkan first_name jika punya data namanya di database
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // 5. UPDATE database kita dengan memasukkan paymentUrl yang didapat dari Midtrans
    await prisma.transaction.update({
      where: { orderId: orderId },
      data: { paymentUrl: transaction.redirect_url }
    });

    // 6. Kirim response ke Frontend
    return NextResponse.json({ 
      token: transaction.token,
      redirect_url: transaction.redirect_url 
    });

  } catch (error) {
    console.error("Midtrans Error:", error);
    return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
  }
}