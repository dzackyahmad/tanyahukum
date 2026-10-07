import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Health check untuk mengetes apakah webhook bisa dijangkau (lewat ngrok/domain)
// Catatan keamanan: jangan pernah menampilkan potongan server key di sini.
export async function GET() {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  
  return NextResponse.json({ 
    status: "Webhook endpoint is active",
    time: new Date().toISOString(),
    env_check: {
      has_server_key: serverKey.length > 0,
      is_production: process.env.NODE_ENV === "production"
    },
    webhook_url_hint: "Pastikan URL ini terdaftar di Dashboard Midtrans -> Settings -> Configuration -> Payment Notification URL"
  });
}

// Perbandingan constant-time untuk mencegah timing attack pada signature
function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      order_id, 
      transaction_status, 
      fraud_status, 
      status_code, 
      gross_amount, 
      signature_key 
    } = body;
    console.log("[WEBHOOK] Received for order_id:", order_id, "status:", transaction_status);

    // 1. Verifikasi Signature Key
    const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
    const isProduction = process.env.NODE_ENV === "production";

    // Fail-closed: tanpa server key, signature bisa dihitung siapa saja
    if (!serverKey && isProduction) {
      console.error("[MIDTRANS-WEBHOOK] ERROR: MIDTRANS_SERVER_KEY is empty or missing!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Signature Midtrans: SHA512(order_id + status_code + gross_amount + serverKey)
    // JANGAN log string gabungan ini — isinya mengandung server key.
    const localSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest("hex");

    // Sandbox Bypass (hanya non-production, perilaku lama dipertahankan untuk dev lokal/ngrok).
    // Di Vercel (production & preview) NODE_ENV selalu "production" sehingga signature wajib valid.
    if (!isProduction) {
      if (!safeEqualHex(localSignature, signature_key)) {
        console.warn("[MIDTRANS-WEBHOOK] SANDBOX BYPASS: signature tidak cocok, tetap diproses (non-production).");
      }
    } else if (!safeEqualHex(localSignature, signature_key)) {
      console.error(`[MIDTRANS-WEBHOOK] Signature mismatch for Order: ${order_id}`);
      return NextResponse.json({ error: "Invalid Signature" }, { status: 403 });
    }

    let finalStatus = "PENDING";

    // 2. Mapping Status
    // Midtrans status: capture (credit card), settlement (non-card/success), pending, deny, cancel, expire
    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "challenge") {
        finalStatus = "PENDING";
      } else {
        finalStatus = "SUCCESS";
      }
    } else if (["cancel", "deny", "expire"].includes(transaction_status)) {
      finalStatus = "FAILED";
    }

    // 3. Update Database
    const transaction = await prisma.transaction.findUnique({
      where: { orderId: order_id },
    });

    if (!transaction) {
      console.error(`[MIDTRANS-WEBHOOK] Transaction ${order_id} not found in DB`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "SUCCESS") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // Pastikan nominal yang dibayar sama dengan nominal transaksi di DB
    if (
      finalStatus === "SUCCESS" &&
      transaction.amount != null &&
      Number.parseFloat(gross_amount) !== Number(transaction.amount)
    ) {
      console.error(`[MIDTRANS-WEBHOOK] Amount mismatch for Order: ${order_id}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    if (finalStatus === "SUCCESS") {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { orderId: order_id },
          data: { status: "SUCCESS" },
        }),
        prisma.user.update({
          where: { id: transaction.userId },
          data: {
            tier: "PRO",
            promptLimit: 0,
          },
        }),
      ]);
      console.log(`[MIDTRANS-WEBHOOK] Order ${order_id} SUCCESS, user upgraded to PRO.`);
    } else {
      await prisma.transaction.update({
        where: { orderId: order_id },
        data: { status: finalStatus },
      });
      console.log(`[MIDTRANS-WEBHOOK] Transaction ${order_id} updated to ${finalStatus}.`);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (error) {
    console.error("[MIDTRANS-WEBHOOK] FATAL ERROR:", error?.message);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
