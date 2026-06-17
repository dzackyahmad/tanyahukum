import { NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const prevWeekStart = new Date(now); prevWeekStart.setDate(prevWeekStart.getDate() - 14);
    const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    // === PARALLEL AGGREGATION QUERIES ===
    const [
      totalUsers, totalAdmins, proUsers, freeUsers,
      totalRegulations, totalViews, totalChatMessages,
      usersThisWeek, usersPrevWeek,
      regsThisWeek, regsPrevWeek,
      chatsToday,
      totalStorageRaw,
      popularDocs, recentDocs,
      trendingIssues,
      searchTrendsRaw,
      categoryDistribution,
      activeUsersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { tier: 'PRO' } }),
      prisma.user.count({ where: { tier: 'FREE' } }),
      prisma.regulation.count(),
      prisma.regulation.aggregate({ _sum: { viewCount: true } }),
      prisma.chatHistory.count(),
      // Growth: users this week vs prev week
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: prevWeekStart, lt: weekAgo } } }),
      // Growth: regulations this week vs prev week
      prisma.regulation.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.regulation.count({ where: { createdAt: { gte: prevWeekStart, lt: weekAgo } } }),
      // Chat messages today
      prisma.chatHistory.count({ where: { role: 'USER', createdAt: { gte: todayStart } } }),
      // Total storage
      prisma.regulation.aggregate({ _sum: { fileSize: true } }),
      // Popular docs (top 5)
      prisma.regulation.findMany({ orderBy: { viewCount: 'desc' }, take: 5, select: { id: true, title: true, viewCount: true, category: true, fileSize: true, fileUrl: true, description: true } }),
      // Recent docs
      prisma.regulation.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, createdAt: true, category: true, fileSize: true, fileUrl: true, description: true } }),
      // Trending issues
      prisma.trendingIssue.findMany({ orderBy: { publishDate: 'desc' }, take: 5, select: { id: true, title: true, description: true, publishDate: true, location: true, newsLink: true, isActive: true } }),
      // Search trends (last 365 days)
      prisma.searchLog.findMany({ where: { createdAt: { gte: yearAgo } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
      // Category distribution
      prisma.regulation.groupBy({ by: ['category'], _count: { id: true }, where: { category: { not: null } } }),
      // Active users today (users who sent messages today)
      prisma.chatHistory.findMany({ where: { role: 'USER', createdAt: { gte: todayStart } }, select: { userId: true }, distinct: ['userId'] }),
    ]);

    // === PROCESS SEARCH TRENDS ===
    const trendMap = {};
    searchTrendsRaw.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      trendMap[dateKey] = (trendMap[dateKey] || 0) + 1;
    });
    const searchTrends = Object.keys(trendMap)
      .sort()
      .map(date => ({ date, searches: trendMap[date] }));

    // === COMPUTE GROWTH PERCENTAGES ===
    const calcGrowth = (current, prev) => {
      if (prev === 0) return current > 0 ? "+100%" : "0%";
      const pct = Math.round(((current - prev) / prev) * 100);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    // === CATEGORY DISTRIBUTION ===
    const categories = categoryDistribution.map(c => ({
      name: c.category || "Lainnya",
      count: c._count.id
    })).sort((a, b) => b.count - a.count);

    // === FORMAT RESPONSE ===
    return NextResponse.json({
      success: true,
      data: {
        cards: {
          totalDocuments: { value: totalRegulations, growth: calcGrowth(regsThisWeek, regsPrevWeek), label: "Total Dokumen" },
          totalUsers: { value: totalUsers, growth: calcGrowth(usersThisWeek, usersPrevWeek), label: "Total Pengguna" },
          activeUsersToday: { value: activeUsersToday.length, label: "User Aktif Hari Ini" },
          totalViews: { value: totalViews._sum?.viewCount || 0, label: "Total Views" },
          chatRequestsToday: { value: chatsToday, label: "Chat Hari Ini" },
          totalChatMessages: { value: totalChatMessages, label: "Total Chat Msg" },
          proUsers: { value: proUsers, label: "Pro Members" },
          freeUsers: { value: freeUsers, label: "Free Users" },
          totalAdmins: { value: totalAdmins, label: "Administrator" },
          storageUsed: { value: totalStorageRaw._sum?.fileSize || 0, label: "Storage Used" },
        },
        popularDocs: popularDocs.map(d => ({ id: d.id, name: d.title, views: d.viewCount, category: d.category, size: d.fileSize, fileUrl: d.fileUrl, description: d.description })),
        recentDocs: recentDocs.map(d => ({ id: d.id, name: d.title, date: d.createdAt, category: d.category, size: d.fileSize, fileUrl: d.fileUrl, description: d.description })),
        trendingIssues,
        searchTrends,
        categoryDistribution: categories,
        userDistribution: { pro: proUsers, free: freeUsers, admin: totalAdmins },
      }
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Dashboard Analytics Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}