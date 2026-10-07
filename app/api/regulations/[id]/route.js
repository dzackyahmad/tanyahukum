import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Field publik saja (tanpa isi teks lengkap `content` & path internal storage)
const PUBLIC_REGULATION_SELECT = {
  id: true,
  title: true,
  description: true,
  fileUrl: true,
  fileName: true,
  fileSize: true,
  category: true,
  isProcessed: true,
  isActive: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
};

// Maks 3 hitungan view per IP per dokumen per menit (cegah view count digelembungkan)
function shouldCountView(req, id) {
  return rateLimit(`${getClientIp(req)}:${id}`, 3, "regulation-view");
}

// ==========================================
// 1. GET: MURNI UNTUK MENGAMBIL DATA (Aman di-cache oleh Vercel)
// ==========================================
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID Regulasi wajib disertakan." },
        { status: 400 }
      );
    }

    const regulation = await prisma.regulation.findUnique({
      where: { id: id },
      select: PUBLIC_REGULATION_SELECT,
    });

    // Dokumen yang dinonaktifkan admin tidak boleh diakses publik
    if (!regulation || regulation.isActive === false) {
      return NextResponse.json(
        { error: "Data hukum tidak ditemukan." },
        { status: 404 }
      );
    }

    // Increment viewCount setiap kali detail dokumen dibuka (fire-and-forget)
    if (shouldCountView(req, id)) {
      prisma.regulation.update({
        where: { id: id },
        data: { viewCount: { increment: 1 } },
      }).catch(err => console.error("viewCount update error:", err));
    }

    return NextResponse.json({
      data: regulation,
      message: "Berhasil mengambil detail regulasi.",
    });

  } catch (error) {
    console.error("API Regulations GET [id] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses detail regulasi." },
      { status: 500 }
    );
  }
}

// ==========================================
// 2. PATCH: KHUSUS UNTUK MENAMBAH VIEW COUNT (+1)
// ==========================================
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID Regulasi wajib disertakan." },
        { status: 400 }
      );
    }

    // Spam dari IP yang sama tidak dihitung, tapi respons tetap sukses (flow frontend tidak berubah)
    if (shouldCountView(req, id)) {
      await prisma.regulation.update({
        where: { id: id },
        data: {
          viewCount: {
            increment: 1, // Otomatis nambah +1 di database
          },
        },
      });
    }

    return NextResponse.json({
      message: "View count berhasil ditambahkan.",
    });

  } catch (error) {
    console.error("API Regulations PATCH [id] Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui view count." },
      { status: 500 }
    );
  }
}