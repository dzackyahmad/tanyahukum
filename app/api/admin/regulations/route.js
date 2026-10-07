import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { requireAdmin, isSafeHttpUrl } from '@/lib/security';

// GET: Ambil daftar dokumen hukum dengan Pagination & Search (Khusus Admin)
export async function GET(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const skip = (page - 1) * limit;

    const whereClause = {
      // Di admin, kita mungkin ingin menampilkan semua data (termasuk yg isActive: false jika ada)
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(category && { category: category }),
    };

    const [regulations, totalCount] = await Promise.all([
      prisma.regulation.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        // Admin biasanya lebih butuh melihat data yang baru saja ditambahkan
        orderBy: { createdAt: "desc" },
      }),
      prisma.regulation.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: regulations,
      meta: {
        totalData: totalCount,
        currentPage: page,
        dataPerPage: limit,
        totalPages: totalPages
      }
    });

  } catch (error) {
    console.error("Admin API Regulations GET Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dokumen" },
      { status: 500 }
    );
  }
}

// POST: Input dokumen hukum baru (TETAP DIPERTAHANKAN UNTUK ADMIN)
export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { title, description, fileUrl, category, fileSize, fileName } = body;

    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: "Judul dan link file wajib diisi" },
        { status: 400 }
      );
    }

    // Cegah URL berbahaya (mis. javascript:) tersimpan dan dibuka user
    if (!isSafeHttpUrl(fileUrl)) {
      return NextResponse.json({ error: "Link file harus berupa URL http/https" }, { status: 400 });
    }

    const newRegulation = await prisma.regulation.create({
      data: {
        title,
        description,
        fileUrl,
        category,
        fileName: fileName || null,
        fileSize: fileSize ? parseInt(fileSize) : null,
        isActive: true,
      },
    });

    return NextResponse.json(newRegulation, { status: 201 });
  } catch (error) {
    console.error("Error creating regulation:", error);
    return NextResponse.json(
      { error: "Gagal menginput dokumen hukum" },
      { status: 500 }
    );
  }
}