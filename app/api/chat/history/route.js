import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// DELETE /api/chat/history — hapus SEMUA riwayat chat milik user yang sedang login.
// Wajib login, hanya data milik sendiri, dan body harus berisi { confirm: "HAPUS" }
// (konfirmasi kedua di UI) agar tidak terpicu tanpa sengaja.
// Pesan ikut terhapus otomatis lewat relasi onDelete: Cascade (Chat → ChatHistory).
export async function DELETE(req) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rateLimit(session.userId, 3, "chat-delete-all")) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "HAPUS") {
      return NextResponse.json({ error: "Konfirmasi tidak valid." }, { status: 400 });
    }

    const { count } = await prisma.chat.deleteMany({ where: { userId: session.userId } });

    return NextResponse.json({ success: true, deletedChats: count });
  } catch (error) {
    console.error("API Delete All Chats Error:", error?.message);
    return NextResponse.json({ error: "Gagal menghapus riwayat chat." }, { status: 500 });
  }
}
