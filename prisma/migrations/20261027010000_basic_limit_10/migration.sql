-- Batas pertanyaan harian paket Basic: 50 → 10 (keputusan 27 Okt 2026).
-- 1. Pengguna baru: default kolom menjadi 10.
-- 2. Pengguna Basic lama yang masih memakai default 50 ikut menjadi 10.
--    Batas khusus dari admin (nilai selain 50) dan pengguna PRO TIDAK diubah.
-- Rollback (bila diperlukan): ubah default kembali ke 50 dan set promptLimit = 50 untuk
-- daftar id yang dicatat sebelum migrasi.

ALTER TABLE "User" ALTER COLUMN "promptLimit" SET DEFAULT 10;

UPDATE "User" SET "promptLimit" = 10 WHERE "tier" = 'FREE' AND "promptLimit" = 50;
