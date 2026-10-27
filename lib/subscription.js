// Paket langganan. PRO berlaku 30 hari sejak pembayaran dikonfirmasi; membeli lagi saat masih
// aktif menambah 30 hari dari tanggal berakhir. Pengguna PRO lama (sebelum aturan 30 hari) dan
// PRO yang diberikan admin tidak punya tanggal berakhir (proExpiresAt kosong) dan tetap aktif.

export const PRO_DURATION_DAYS = 30;
export const PRO_PRICE = 49900;
export const FREE_PROMPT_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (v) => (v ? new Date(v) : null);

export function proExpiryAfterPayment(user, now = new Date()) {
  const current = toDate(user?.proExpiresAt);
  const base = user?.tier === "PRO" && current && current > now ? current : now;
  return new Date(base.getTime() + PRO_DURATION_DAYS * DAY_MS);
}

// Paket yang benar-benar berlaku saat ini (tier di database bisa masih PRO walau sudah lewat).
export function effectivePlan(user, now = new Date()) {
  const expiresAt = toDate(user?.proExpiresAt);
  if (user?.tier === "PRO") {
    if (!expiresAt) return { tier: "PRO", status: "aktif", expiresAt: null, noExpiry: true, expired: false };
    if (expiresAt > now) return { tier: "PRO", status: "aktif", expiresAt, noExpiry: false, expired: false };
    return { tier: "FREE", status: "berakhir", expiresAt, noExpiry: false, expired: true };
  }
  return { tier: "FREE", status: "gratis", expiresAt, noExpiry: false, expired: false };
}

// Batas pertanyaan harian yang berlaku (null = tanpa batas). PRO menyimpan promptLimit 0,
// jadi saat PRO berakhir dipakai batas default FREE. promptLimit FREE lain (termasuk 0 yang
// diatur admin) tetap dihormati.
export function dailyLimitFor(user, now = new Date()) {
  const plan = effectivePlan(user, now);
  if (plan.tier === "PRO") return null;
  if (plan.expired) return FREE_PROMPT_LIMIT;
  return user?.promptLimit ?? FREE_PROMPT_LIMIT;
}

// Turunkan PRO yang sudah berakhir ke FREE. Kondisi di WHERE mencegah balapan dengan
// perpanjangan yang terjadi bersamaan (yang sudah diperpanjang tidak ikut turun).
export async function downgradeIfExpired(prisma, user, now = new Date()) {
  if (!effectivePlan(user, now).expired) return false;
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, tier: "PRO", proExpiresAt: { lte: now } },
    data: { tier: "FREE", promptLimit: FREE_PROMPT_LIMIT },
  });
  return count > 0;
}

// Batas hari kuota: sama dengan pengecekan di /api/chat (tengah malam waktu server;
// di Vercel = UTC, yaitu 07.00 WIB).
export function startOfQuotaDay(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function nextQuotaReset(now = new Date()) {
  return new Date(startOfQuotaDay(now).getTime() + DAY_MS);
}

// Status kuota pertanyaan harian pengguna setelah sebuah pertanyaan (dikirim di event `done`).
// warning = sudah ≥ 70% terpakai → frontend menampilkan peringatan. PRO aktif (limit null) → null.
export const QUOTA_WARNING_RATIO = 0.7;

export function quotaStatus(used, limit, now = new Date()) {
  if (limit === null || limit === undefined) return null;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    warning: limit > 0 && used / limit >= QUOTA_WARNING_RATIO,
    resetsAt: nextQuotaReset(now).toISOString(),
  };
}
