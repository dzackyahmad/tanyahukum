import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { requireAdmin } from '@/lib/security';

export async function POST(req) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "File dokumen wajib diunggah" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File harus PDF" }, { status: 400 });
    }

    // Batas ukuran upload dokumen (cegah file raksasa menghabiskan memori/storage)
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 50MB" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const bucketName = "legal-documents";

    // Pastikan bucket ada
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.find((b) => b.name === bucketName);

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validasi isi file benar-benar PDF (MIME type dari client bisa dipalsukan)
    // (spesifikasi PDF mengizinkan header "%PDF-" berada di 1024 byte pertama)
    if (!buffer.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
      return NextResponse.json({ error: "File harus PDF" }, { status: 400 });
    }
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${Date.now()}_${safeFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      return NextResponse.json({ error: "Gagal upload dokumen" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFileName);

    return NextResponse.json(
      {
        fileUrl: publicUrlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: "Gagal upload dokumen" }, { status: 500 });
  }
}
