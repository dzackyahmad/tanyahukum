import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Hanya kolom ini yang boleh dipakai untuk sorting (cegah error/bocor via orderBy bebas)
const ALLOWED_SORT_FIELDS = ["title", "viewCount", "createdAt", "updatedAt"];

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10") || 10));
        const search = searchParams.get("search")?.trim() || "";
        const category = searchParams.get("category") || "";
        const requestedSort = searchParams.get("sortBy");
        const sortBy = ALLOWED_SORT_FIELDS.includes(requestedSort) ? requestedSort : "title";
        const requestedOrder = searchParams.get("order");
        const order = ["asc", "desc"].includes(requestedOrder)
            ? requestedOrder
            : (sortBy === "title" ? "asc" : "desc");

        // Atribusi log pencarian diambil dari sesi login (bukan query param yang bisa dipalsukan)
        let userId = null;
        try {
            const session = await getSession();
            userId = session?.userId || null;
        } catch {
            userId = null;
        }

        // [LOG]: Simpan ke SearchLog (Asynchronous, don't await to keep response fast)
        // Hanya catat maks 30 pencarian/menit per IP (cegah spam data analitik)
        if (search && rateLimit(getClientIp(req), 30, "search-log")) {
            prisma.searchLog.create({
                data: {
                    query: search.slice(0, 200),
                    userId: userId 
                }
            }).catch(err => console.error("SearchLog Error:", err));
        }

        const skip = (page - 1) * limit;

        // Susun Filter
        const whereClause = {
            isActive: true,
            ...(search && {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } }
                ]
            }),
            ...(category && category !== "Semua" && { category: category }),
        };

        // Susun Sort
        const orderBy = { [sortBy]: order };

        // Fetch Data
        const [regulations, totalCount] = await Promise.all([
            prisma.regulation.findMany({
                where: whereClause,
                skip: skip,
                take: limit,
                orderBy: orderBy,
                select: {
                    id: true,
                    title: true,
                    description: true, // Tambahkan ini agar tidak kosong di detail
                    category: true,
                    fileSize: true,
                    isProcessed: true,
                    fileUrl: true,
                    createdAt: true,
                    viewCount: true
                }
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
        console.error("API Regulations GET Error:", error);
        return NextResponse.json(
            { error: "Terjadi kesalahan saat mengambil daftar regulasi." },
            { status: 500 }
        );
    }
}