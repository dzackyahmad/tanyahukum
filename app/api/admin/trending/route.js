// app/api/admin/trending/route.js
// Menangani pengambilan daftar isu dan pembuatan isu baru.
// Tanggal menggunakan format ISO 8601

import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireAdmin, normalizeHttpUrl } from '@/lib/security';

// GET: Ambil semua daftar isu terkini untuk dashboard
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const issues = await prisma.trendingIssue.findMany({
      orderBy: { publishDate: "desc" },
    });
    return NextResponse.json(issues);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data isu terkini" },
      { status: 500 }
    );
  }
}

// POST: Input Isu Terkini Baru
export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { title, description, publishDate, newsLink, location } = body;

    // newsLink opsional, tapi jika diisi harus URL http/https (cegah javascript: URL)
    const safeNewsLink = newsLink ? normalizeHttpUrl(newsLink) : null;
    if (newsLink && !safeNewsLink) {
      return NextResponse.json({ error: "Link berita harus berupa URL http/https" }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json(
        { error: "Judul dan Deskripsi wajib diisi" },
        { status: 400 }
      );
    }

    const newIssue = await prisma.trendingIssue.create({
      data: {
        title,
        description,
        publishDate: publishDate ? new Date(publishDate) : new Date(),
        newsLink: safeNewsLink,
        location: location || null,
        isActive: true,
      },
    });

    return NextResponse.json(newIssue, { status: 201 });
  } catch (error) {
    console.error("Error creating trending issue:", error);
    return NextResponse.json(
      { error: "Gagal menginput isu terkini" },
      { status: 500 }
    );
  }
}