import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { MODE_CONFIG, modelName, cooldownOf, rateLimitSnapshot, dailyUsageLevel, geminiDailyLimits, modePriority } from "@/lib/modelRouter";
import { loadModelStatuses, geminiAnswersToday } from "@/lib/modelStatus";
import {
  effectivePlan, dailyLimitFor, downgradeIfExpired, startOfQuotaDay, nextQuotaReset,
  PRO_DURATION_DAYS, PRO_PRICE,
} from "@/lib/subscription";

// Halaman Penggunaan (Profil › Penggunaan). Hanya data milik pengguna yang login.
// - "aktual"  : dihitung dari database TanyaHukum (PromptUsage, Transaction, User).
// - "estimasi": status ketersediaan model dari sisi server (cooldown & header batas Groq),
//               berlaku untuk seluruh aplikasi dan hanya dari instance server yang menjawab.
const DAY_MS = 24 * 60 * 60 * 1000;

const MODELS = [...new Map(Object.values(MODE_CONFIG).map((c) => [c.model, c.provider])).entries()]
  .map(([model, provider]) => ({ model, provider }));

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!rateLimit(session.userId, 30, "usage")) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
    }

    const userId = session.userId;
    const now = new Date();
    const dayStart = startOfQuotaDay(now);
    const monthStart = new Date(now.getTime() - 30 * DAY_MS);

    const geminiLimits = geminiDailyLimits();
    const [user, todayByModel, monthByModel, lastPayment, statuses, geminiToday] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tier: true, promptLimit: true, proExpiresAt: true },
      }),
      prisma.promptUsage.groupBy({
        by: ["model"],
        where: { userId, createdAt: { gte: dayStart } },
        _count: { _all: true },
      }),
      prisma.promptUsage.groupBy({
        by: ["model"],
        where: { userId, createdAt: { gte: monthStart } },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true },
      }),
      prisma.transaction.findFirst({
        where: { userId, status: "SUCCESS" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true, amount: true },
      }),
      loadModelStatuses(prisma),
      geminiAnswersToday(prisma, [...geminiLimits.keys()], { now: now.getTime() }),
    ]);

    if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    await downgradeIfExpired(prisma, user, now);

    const plan = effectivePlan(user, now);
    const limit = dailyLimitFor(user, now);
    const usedToday = todayByModel.reduce((n, r) => n + r._count._all, 0);

    const today = new Map(todayByModel.map((r) => [r.model, r._count._all]));
    const month = new Map(monthByModel.map((r) => [r.model, r]));
    const models = MODELS.map(({ model, provider }) => {
      const m = month.get(model);
      return {
        model,
        name: modelName(model),
        provider,
        today: today.get(model) || 0,
        last30Days: m?._count._all || 0,
        inputTokens: m?._sum.inputTokens ?? 0,
        outputTokens: m?._sum.outputTokens ?? 0,
      };
    });
    // Pertanyaan sebelum pencatatan model dimulai, atau model yang tidak dikenal lagi
    const known = new Set(MODELS.map((m) => m.model));
    const untracked = {
      today: todayByModel.filter((r) => !known.has(r.model)).reduce((n, r) => n + r._count._all, 0),
      last30Days: monthByModel.filter((r) => !known.has(r.model)).reduce((n, r) => n + r._count._all, 0),
    };

    // Tabel ModelStatus (dibagi antar instance) diutamakan; memori instance ini sebagai cadangan.
    const availability = MODELS.map(({ model, provider }) => {
      const row = statuses.get(model);
      const memCooldown = cooldownOf(model, now.getTime());
      const dbCooldownUntil = row?.cooldownUntil && new Date(row.cooldownUntil) > now ? new Date(row.cooldownUntil) : null;
      const until = [dbCooldownUntil, memCooldown && new Date(memCooldown.until)].filter(Boolean).sort((a, b) => b - a)[0];
      const reason = until
        ? (memCooldown && memCooldown.until === until.getTime() ? memCooldown.reason : row?.cooldownReason) || null
        : null;
      const mem = rateLimitSnapshot(model);
      const rowObserved = row?.observedAt ? new Date(row.observedAt).getTime() : 0;
      const rate = mem && mem.observedAt > rowObserved
        ? mem
        : row?.observedAt
          ? {
              limitRequests: row.limitRequests, remainingRequests: row.remainingRequests,
              limitTokens: row.limitTokens, remainingTokens: row.remainingTokens,
              resetTokens: row.resetTokens, observedAt: rowObserved,
            }
          : null;
      // Model Groq tanpa GROQ_API_KEY di server ini tidak pernah dipanggil → dikunci di menu
      if (provider === "groq" && !process.env.GROQ_API_KEY) {
        return { model, name: modelName(model), provider, status: "dibatasi", cooldownUntil: null, cooldownReason: "not_configured", rateLimit: null, daily: null };
      }
      return {
        model,
        name: modelName(model),
        provider,
        status: until ? "dibatasi" : "tersedia",
        cooldownUntil: until ? until.toISOString() : null,
        cooldownReason: reason,
        rateLimit: provider === "groq" && rate ? { ...rate, observedAt: new Date(rate.observedAt).toISOString() } : null,
        // Pemakaian harian seluruh aplikasi; warning = ≥ 70% (Groq aktual, Gemini estimasi bila batasnya diisi di env)
        daily: dailyUsageLevel({ provider, snapshot: rate, used: geminiToday.get(model) ?? 0, limit: geminiLimits.get(model), now: now.getTime() }),
      };
    });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      plan: {
        tier: plan.tier,
        name: plan.tier === "PRO" ? "Pro" : "Basic",
        status: plan.status,
        expiresAt: plan.expiresAt ? plan.expiresAt.toISOString() : null,
        noExpiry: plan.noExpiry,
        lastPaymentAt: lastPayment?.updatedAt?.toISOString() ?? null,
        durationDays: PRO_DURATION_DAYS,
        price: PRO_PRICE,
      },
      quota: {
        used: usedToday,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - usedToday),
        resetsAt: nextQuotaReset(now).toISOString(),
      },
      models,
      untracked,
      availability,
      // Urutan Ragas: menu pilih model memakai ini untuk memindahkan pilihan bila model terpilih habis
      fallbackOrder: modePriority(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("API Usage Error:", error?.message);
    return NextResponse.json({ error: "Gagal mengambil data penggunaan" }, { status: 500 });
  }
}
