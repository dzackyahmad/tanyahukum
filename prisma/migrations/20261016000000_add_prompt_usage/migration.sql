-- Menutup celah kuota: kuota harian dihitung dari PromptUsage (tidak ikut terhapus saat
-- riwayat chat dihapus). Hanya MENAMBAH tabel; tidak ada data yang diubah atau dihapus.

-- CreateTable
CREATE TABLE IF NOT EXISTS "PromptUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PromptUsage_userId_createdAt_idx" ON "PromptUsage"("userId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PromptUsage" ADD CONSTRAINT "PromptUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: pertanyaan 2 hari terakhir yang masih ada di riwayat ikut tercatat,
-- agar pemakaian kuota hari ini tidak kembali ke 0 saat fitur ini aktif.
INSERT INTO "PromptUsage" ("id", "userId", "createdAt")
SELECT "id", "userId", "createdAt" FROM "ChatHistory"
WHERE "role" = 'USER' AND "createdAt" >= NOW() - INTERVAL '2 days'
ON CONFLICT ("id") DO NOTHING;
