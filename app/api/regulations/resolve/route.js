import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isSafeHttpUrl } from "@/lib/security";

// GET /api/regulations/resolve?title=...&title=...
// Mencocokkan judul dokumen yang dikutip AI (mis. "Regulasi Perdata - PP NO 4 TH 1977")
// ke dokumen di database, agar referensi di jawaban chatbot bisa diklik.
// Read-only: hanya dokumen aktif, hanya field publik, tidak mencatat SearchLog.

const MAX_TITLES = 20;
const MAX_TITLE_LENGTH = 300;

export async function GET(req) {
  try {
    if (!rateLimit(getClientIp(req), 60, "regulation-resolve")) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const titles = [...new Set(
      searchParams.getAll("title")
        .map((t) => t.trim())
        .filter((t) => t && t.length <= MAX_TITLE_LENGTH)
    )].slice(0, MAX_TITLES);

    if (titles.length === 0) {
      return NextResponse.json({ data: {} });
    }

    // AI kadang menghilangkan awalan kategori: "PERDA 10 TH 2023" untuk judul
    // "Regulasi Ketenagakerjaan - PERDA 10 TH 2023" → cocokkan juga berdasarkan akhiran " - <judul>".
    const regulations = await prisma.regulation.findMany({
      where: {
        isActive: true,
        OR: titles.flatMap((title) => [
          { title: { equals: title, mode: "insensitive" } },
          { title: { endsWith: ` - ${title}`, mode: "insensitive" } },
        ]),
      },
      select: { id: true, title: true, fileUrl: true },
      orderBy: { title: "asc" }, // urutan stabil jika ada lebih dari satu kandidat
    });

    // Kunci: judul yang diminta (lowercase) → { id, fileUrl }. Kecocokan persis diutamakan.
    const data = {};
    for (const requested of titles) {
      const key = requested.toLowerCase();
      const candidates = regulations.filter((r) => isSafeHttpUrl(r.fileUrl));
      const match =
        candidates.find((r) => r.title.toLowerCase() === key) ||
        candidates.find((r) => r.title.toLowerCase().endsWith(` - ${key}`));
      if (match) data[key] = { id: match.id, fileUrl: match.fileUrl };
    }

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  } catch (error) {
    console.error("API Regulations Resolve Error:", error?.message);
    return NextResponse.json({ error: "Gagal mencari dokumen." }, { status: 500 });
  }
}
