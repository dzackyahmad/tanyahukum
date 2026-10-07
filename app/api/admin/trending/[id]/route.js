import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireAdmin, normalizeHttpUrl } from '@/lib/security';

// DELETE: Hapus Isu Terkini
export async function DELETE(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // PERBAIKAN: Wajib pakai await params di Next.js versi terbaru!
    const { id } = await params;

    await prisma.trendingIssue.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Isu terkini berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting issue:", error);
    return NextResponse.json(
      { error: "Gagal menghapus isu" },
      { status: 500 }
    );
  }
}

// PATCH: Edit Isu Terkini
export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await req.json();
    const { title, description, newsLink, location } = body;

    // newsLink opsional, tapi jika diisi harus URL http/https (cegah javascript: URL)
    const safeNewsLink = newsLink ? normalizeHttpUrl(newsLink) : null;
    if (newsLink && !safeNewsLink) {
      return NextResponse.json({ error: "Link berita harus berupa URL http/https" }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json({ error: "Judul dan deskripsi wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.trendingIssue.update({
      where: { id },
      data: {
        title,
        description,
        newsLink: safeNewsLink,
        location: location || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating issue:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate isu" },
      { status: 500 }
    );
  }
}