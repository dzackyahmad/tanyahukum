// Status ketersediaan model yang dibagi antar instance server (tabel ModelStatus), dipakai
// halaman Penggunaan, menu pilih model, dan route chat (cooldown bersama). Penulisan dibatasi
// paling sering sekali per THROTTLE_MS per model dan tidak pernah menggagalkan/menunda jawaban chat.
import { markCooldown, msUntilPacificMidnight } from "@/lib/modelRouter";

const THROTTLE_MS = 30_000;
const SYNC_TIMEOUT_MS = 1500;
const lastWrite = new Map(); // model → waktu tulis terakhir (per instance)

export async function saveModelStatus(prisma, model, provider, data, { now = Date.now(), force = false } = {}) {
  if (!force && now - (lastWrite.get(model) || 0) < THROTTLE_MS) return false;
  lastWrite.set(model, now);
  try {
    await prisma.modelStatus.upsert({
      where: { model },
      create: { model, provider, ...data },
      update: { provider, ...data },
    });
    return true;
  } catch (err) {
    console.error("Gagal menyimpan status model:", err?.message);
    return false;
  }
}

export function rateLimitData(snapshot) {
  if (!snapshot) return {};
  return {
    limitRequests: snapshot.limitRequests,
    remainingRequests: snapshot.remainingRequests,
    limitTokens: snapshot.limitTokens,
    remainingTokens: snapshot.remainingTokens,
    resetTokens: snapshot.resetTokens,
    observedAt: new Date(snapshot.observedAt),
  };
}

export async function loadModelStatuses(prisma) {
  try {
    const rows = await prisma.modelStatus.findMany();
    return new Map(rows.map((r) => [r.model, r]));
  } catch (err) {
    console.error("Gagal membaca status model:", err?.message);
    return new Map();
  }
}

// Salin cooldown dari tabel ke memori instance ini sebelum memilih model, agar model yang
// habis di instance lain tidak dicoba lagi. Lambat (> SYNC_TIMEOUT_MS) atau gagal → dilewati,
// chat tetap jalan dengan cooldown di memori saja.
export async function syncCooldowns(prisma, { now = Date.now(), timeoutMs = SYNC_TIMEOUT_MS } = {}) {
  let timer;
  try {
    const rows = await Promise.race([
      prisma.modelStatus.findMany({
        where: { cooldownUntil: { gt: new Date(now) } },
        select: { model: true, cooldownUntil: true, cooldownReason: true },
      }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), timeoutMs); }),
    ]);
    for (const r of rows || []) {
      markCooldown(r.model, new Date(r.cooldownUntil).getTime() - now, r.cooldownReason, now);
    }
    return rows?.length || 0;
  } catch (err) {
    console.error("Gagal membaca cooldown model:", err?.message);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

// Jumlah jawaban per model Gemini sejak kuota hariannya pulih (tengah malam Pasifik), untuk
// SEMUA pengguna. Dasar estimasi pemakaian harian (lihat dailyUsageLevel di lib/modelRouter.js).
export async function geminiAnswersToday(prisma, models, { now = Date.now() } = {}) {
  if (!models.length) return new Map();
  try {
    const since = new Date(now + msUntilPacificMidnight(now) - 24 * 60 * 60 * 1000);
    const rows = await prisma.promptUsage.groupBy({
      by: ["model"],
      where: { model: { in: models }, createdAt: { gte: since } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.model, r._count._all]));
  } catch (err) {
    console.error("Gagal menghitung pemakaian harian model:", err?.message);
    return new Map();
  }
}

export function resetModelStatusThrottle() {
  lastWrite.clear();
}
