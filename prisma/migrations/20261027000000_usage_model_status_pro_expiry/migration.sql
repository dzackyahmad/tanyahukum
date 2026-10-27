-- Halaman Penggunaan, fallback model, dan PRO 30 hari.
-- Hanya MENAMBAH kolom (boleh kosong) dan satu tabel baru; tidak ada data yang diubah atau dihapus.
-- Pengguna PRO lama tetap PRO tanpa tanggal berakhir (proExpiresAt kosong).
-- Diterapkan dengan `prisma db execute` (database tidak memakai riwayat prisma migrate).

-- AlterTable: pencatatan model & token per pertanyaan
ALTER TABLE "PromptUsage" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "PromptUsage" ADD COLUMN IF NOT EXISTS "mode" TEXT;
ALTER TABLE "PromptUsage" ADD COLUMN IF NOT EXISTS "inputTokens" INTEGER;
ALTER TABLE "PromptUsage" ADD COLUMN IF NOT EXISTS "outputTokens" INTEGER;

-- AlterTable: tanggal berakhir paket PRO (30 hari sejak pembayaran)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "proExpiresAt" TIMESTAMP(3);

-- CreateTable: status ketersediaan model (dibagi antar instance server)
CREATE TABLE IF NOT EXISTS "ModelStatus" (
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "limitRequests" INTEGER,
    "remainingRequests" INTEGER,
    "limitTokens" INTEGER,
    "remainingTokens" INTEGER,
    "resetTokens" TEXT,
    "observedAt" TIMESTAMP(3),
    "cooldownUntil" TIMESTAMP(3),
    "cooldownReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelStatus_pkey" PRIMARY KEY ("model")
);
