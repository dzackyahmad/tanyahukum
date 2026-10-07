import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { verifyToken } from "../../../src/lib/auth-server";
import { EMAIL_REGEX, isSafeHttpUrl } from "@/lib/security";
// ==========================
// GET PROFILE
// ==========================
export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tier: true,
        promptLimit: true,
        personalContext: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // ==========================================
    // SELF-HEALING: Cek jika ada transaksi PENDING yang sudah sukses di Midtrans
    // Ini menangani kasus jika Webhook (ngrok) gagal/telat.
    // ==========================================
    if (user.tier === "FREE") {
      const pendingTx = await prisma.transaction.findFirst({
        where: { 
          userId: user.id,
          status: "PENDING"
        },
        orderBy: { createdAt: "desc" }
      });

      if (pendingTx) {
        console.log("[SYNC-STATUS] Checking Midtrans status for orderId:", pendingTx.orderId);
        try {
          const Midtrans = (await import("midtrans-client")).default;
          // Gunakan CoreApi untuk pengecekan status yang lebih reliabel
          const core = new Midtrans.CoreApi({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
            serverKey: (process.env.MIDTRANS_SERVER_KEY || "").trim(),
            clientKey: (process.env.MIDTRANS_CLIENT_KEY || "").trim(),
          });

          const status = await core.transaction.status(pendingTx.orderId);
          console.log("[SYNC-STATUS] Midtrans returned status:", status.transaction_status, "for", pendingTx.orderId);
          
          if (status.transaction_status === "settlement" || status.transaction_status === "capture") {
             console.log(`[SYNC-STATUS] Transaction ${pendingTx.orderId} is SUCCESS in Midtrans. Upgrading user...`);
             
             await prisma.$transaction([
               prisma.transaction.update({
                 where: { orderId: pendingTx.orderId },
                 data: { status: "SUCCESS" }
               }),
               prisma.user.update({
                 where: { id: user.id },
                 data: { tier: "PRO", promptLimit: 0 }
               })
             ]);
             
             // Kembalikan data yang sudah di-update
             user.tier = "PRO";
             user.promptLimit = 0;
          }
        } catch (syncError) {
          console.error("[SYNC-STATUS] Error syncing status:", syncError.message);
        }
      }
    }

    return NextResponse.json(user);

  } catch (err) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}

// ==========================
// PATCH PROFILE
// ==========================
export async function PATCH(request) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    const body = await request.json();
    const { name, email, currentPassword, newPassword, avatarUrl, personalContext } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData = {};

    if (name) {
      if (typeof name !== "string" || name.trim().length > 100) {
        return NextResponse.json(
          { error: "Nama maksimal 100 karakter" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && !isSafeHttpUrl(avatarUrl)) {
        return NextResponse.json(
          { error: "URL Avatar tidak valid" },
          { status: 400 }
        );
      }
      updateData.avatarUrl = avatarUrl;
    }

    if (email) {
      // Normalisasi sama seperti register/login supaya user tetap bisa login
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Format email tidak valid" },
          { status: 400 }
        );
      }
      if (normalizedEmail !== existingUser.email) {
        updateData.email = normalizedEmail;
      }
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Password lama wajib diisi" },
          { status: 400 }
        );
      }

      // Akun Google tidak punya password lokal
      if (!existingUser.passwordHash) {
        return NextResponse.json(
          { error: "Akun ini login dengan Google dan tidak memiliki password." },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, existingUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Password lama salah" },
          { status: 401 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password minimal 8 karakter" },
          { status: 400 }
        );
      }

      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    if (personalContext !== undefined) {
      if (personalContext !== null && (typeof personalContext !== "string" || personalContext.length > 500)) {
        return NextResponse.json(
          { error: "Konteks personal maksimal 500 karakter." },
          { status: 400 }
        );
      }
      updateData.personalContext = personalContext;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan data" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      message: "Profil berhasil diperbarui",
      user: updatedUser,
    });

  } catch (err) {
    // Email sudah dipakai akun lain (unique constraint)
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Email sudah digunakan" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}

// ==========================
// DELETE ACCOUNT
// ==========================
export async function DELETE(request) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    // 1. Hapus dari database (Prisma Cascade handle chats, histories, transactions)
    await prisma.user.delete({
      where: { id: payload.userId },
    });

    // 2. Clear cookie
    const response = NextResponse.json({
      message: "Akun berhasil dihapus selamanya",
    });

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;

  } catch (err) {
    console.error("[DELETE_ACCOUNT_ERROR]:", err);
    return NextResponse.json(
      { error: "Gagal menghapus akun. Silakan coba lagi nanti." },
      { status: 500 }
    );
  }
}