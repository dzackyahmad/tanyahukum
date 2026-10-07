import { createAdminClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/src/lib/auth-server";

// Cek signature biner JPEG / PNG / WEBP
function isAllowedImageBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return isJpeg || isPng || isWebp;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Tambahkan ini!

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Sesi Anda telah berakhir, silakan masuk kembali." },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);

    if (!payload?.userId) {
      return NextResponse.json({ error: "Token tidak valid." }, { status: 401 });
    }

    // Gunakan admin client untuk bypass RLS di storage
    const supabase = await createAdminClient();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    // VALIDASI UKURAN (2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB." }, { status: 400 });
    }

    // 1. Deklarasi dulu
    const fileExt = file.name.split(".").pop()?.toLowerCase();

    // 2. Baru validasi
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
    if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: "Ekstensi file tidak valid." }, { status: 400 });
    }

    // Validasi MIME type juga (double check)
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung." }, { status: 400 });
    }

    // 3. Baru buat fileName & filePath
    const fileName = `${payload.userId}.${fileExt}`;
    const filePath = fileName;

    // ======================
    // UPLOAD (Convert to Buffer for stability)
    // ======================
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi isi file (magic bytes) — MIME type dari client bisa dipalsukan
    if (!isAllowedImageBuffer(buffer)) {
      return NextResponse.json({ error: "Format file tidak didukung." }, { status: 400 });
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage Error:", uploadError);
      return NextResponse.json({ error: "Gagal mengunggah file, coba lagi." }, { status: 500 });
    }

    // ======================
    // AMBIL PUBLIC URL
    // ======================
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // ======================
    // UPDATE DB
    // ======================
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatarUrl: publicUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        tier: true,
      },
    });

    return NextResponse.json({
      message: "Upload berhasil",
      url: publicUrl,
      user: updatedUser,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });

  } catch (err) {
    console.error("Upload Route Error:", err);

    // Distinguish between auth errors and other server errors
    if (err.message === "Invalid token" || err.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Sesi Anda telah berakhir, silakan masuk kembali." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}