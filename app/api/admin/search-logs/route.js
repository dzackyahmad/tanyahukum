// app/api/admin/search-ogs/route.js
// analisis perilaku user
// tren

import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/security';

// GET: Ambil daftar riwayat pencarian user (untuk Dashboard Admin)
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const logs = await prisma.searchLog.findMany({
      include: {
        user: {
          select: { name: true, email: true } // Agar admin tahu siapa yang cari
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Ambil 100 pencarian terakhir saja agar tidak berat
    });
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil log pencarian" },
      { status: 500 }
    );
  }
}

// POST: Mencatat pencarian baru (biasanya dipanggil API Pencarian Utama)
export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { query, userId } = body;

    if (!query) {
      return NextResponse.json({ error: "Query wajib ada" }, { status: 400 });
    }

    // LOGIKA PERBAIKAN:
    // Jika userId tidak ada, string kosong, atau bukan UUID yang valid, paksa jadi null
    const validUserId = (userId && userId.trim() !== "") ? userId : null;

    const newLog = await prisma.searchLog.create({
        data: {
          query: query,
          userId: validUserId, 
        },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error("Error SearchLog:", error);
    
    // Jika error tetap foreign key (P2003), berarti ID yang dikirim salah/tidak terdaftar
    if (error.code === 'P2003') {
      return NextResponse.json({ error: "User ID tidak terdaftar di database" }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal mencatat log pencarian" }, { status: 500 });
  }
}