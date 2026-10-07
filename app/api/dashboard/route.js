import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

// Cache sederhana 30 detik — kurangi beban 20 query ke DB setiap request
const cache = { data: null, expiresAt: 0 };
const CACHE_TTL = 30_000;

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Kembalikan data cache jika masih valid
        if (cache.data && Date.now() < cache.expiresAt) {
            return NextResponse.json(cache.data, { status: 200, headers: { "Cache-Control": "no-store" } });
        }

        // Reset cache sebelum fetch ulang
        cache.data = null;

        // --- KODE INI BUAT BIKIN BATAS WAKTU HARI INI ---
        // 1. Dapatkan tanggal hari ini (YYYY-MM-DD) versi waktu Indonesia (+7 jam)
        const now = new Date();
        const wibDateString = new Date(now.getTime() + (7 * 60 * 60 * 1000)).toISOString().split('T')[0];

        // 2. Bikin batas pakai format standar internasional dengan ujung +07:00 (WIB)
        // JS dan Prisma bakal otomatis nerjemahin ini ke zona waktu UTC yang pas di database!
        const todayStart = new Date(`${wibDateString}T00:00:00.000+07:00`);
        const todayEnd = new Date(`${wibDateString}T23:59:59.999+07:00`);

        // 1. Tarik Data Utama (Sama seperti sebelumnya)
        const [
            totalUsers,
            totalInteractions,
            totalRegulations,
            totalSearchesToday,
            popularDocsData,
            trendingIssuesData
        ] = await Promise.all([
            prisma.user.count(),

            prisma.chatHistory.count({
                where: {
                    createdAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    }
                }
            }),

            prisma.regulation.count(),

            prisma.searchLog.count({
                where: {
                    createdAt: {
                        gte: todayStart,
                        lte: todayEnd,
                    }
                }
            }),

            prisma.regulation.findMany({
                orderBy: { viewCount: 'desc' },
                take: 10,
                select: { 
                    id: true,
                    title: true, 
                    description: true,
                    category: true,
                    fileSize: true,
                    fileUrl: true,
                    viewCount: true,
                    createdAt: true
                }
            }),

            prisma.trendingIssue.findMany({
                orderBy: { publishDate: 'desc' },
                take: 3,
                // Jangan bocorkan createdBy (ID akun admin) ke semua user
                select: {
                    id: true,
                    title: true,
                    description: true,
                    publishDate: true,
                    newsLink: true,
                    location: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                }
            })
        ]);

        // 2. Tarik & Rekap Data Tren Pencarian per Hari (365 hari terakhir)
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);

        const searchTrendsRaw = await prisma.searchLog.findMany({
            where: { createdAt: { gte: yearAgo } },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Agregasi per tanggal (YYYY-MM-DD)
        const trendMap = {};
        searchTrendsRaw.forEach((log) => {
            const dateKey = log.createdAt.toISOString().split('T')[0];
            trendMap[dateKey] = (trendMap[dateKey] || 0) + 1;
        });

        // Urutkan keys by date lalu ubah ke array
        const formattedSearchTrends = Object.keys(trendMap)
            .sort()
            .map((date) => ({ date, searches: trendMap[date] }));

        // 3. Format Data untuk Frontend
        const formattedPopularDocs = popularDocsData.map(doc => ({
            ...doc,
            name: doc.title,
            views: doc.viewCount || 0
        }));

        const isDev = process.env.NODE_ENV === "development";

        const responseData = {
            success: true,
            data: {
                summary: {
                    total_regulasi: {
                        value: totalRegulations,
                        growth: null,
                        ...(isDev && { _note: "Growth belum dihitung" })
                    },
                    pengguna_aktif: {
                        value: totalUsers,
                        growth: null,
                    },
                    interaksi_harian: {
                        value: totalInteractions,
                        growth: null,
                    },
                    pencarian_harian: { 
                        value: totalSearchesToday,
                        growth: null,
                    }
                },
                dokumen_terpopuler: formattedPopularDocs,
                isu_terkini: trendingIssuesData,
                tren_pencarian: formattedSearchTrends // <-- BOOM! Sekarang datanya 100% dari tabel SearchLog!
            }
        };

        // Simpan ke cache sebelum dikirim
        cache.data = responseData;
        cache.expiresAt = Date.now() + CACHE_TTL;

        return NextResponse.json(responseData, {
            status: 200,
            headers: { "Cache-Control": "no-store" }
        });

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("DB Query Error:", error.code, error.message);
        } else {
            console.error("Unexpected Error:", error);
        }
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}