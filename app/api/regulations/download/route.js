import { NextResponse } from "next/server";

// Batas ukuran file yang diproksikan (cegah memori server habis)
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * GET /api/regulations/download?url=<encodedUrl>&name=<filename>
 * Server-side proxy: fetches PDF from Supabase and streams it back
 * with Content-Disposition: attachment so the browser downloads it.
 * This bypasses the cross-origin restriction that makes the anchor
 * `download` attribute silently open a new tab instead of downloading.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const fileName = searchParams.get("name") || "document.pdf";

    if (!fileUrl) {
      return NextResponse.json({ error: "URL file tidak ditemukan" }, { status: 400 });
    }

    // Validasi: hanya izinkan URL dari domain storage yang dikenal (cegah SSRF)
    try {
      const parsed = new URL(fileUrl);
      const h = parsed.hostname;
      // Hanya HTTPS — cegah downgrade ke HTTP
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "URL tidak diizinkan" }, { status: 400 });
      }
      const allowed =
        h === 'supabase.co' || h.endsWith('.supabase.co') ||
        h === 'r2.dev' || h.endsWith('.r2.dev');
      if (!allowed) {
        return NextResponse.json({ error: "URL tidak diizinkan" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
    }

    // Fetch the file from Supabase (server-side, no CORS issue)
    // redirect: "manual" → redirect ke host lain tidak diikuti (cegah bypass allowlist)
    const upstream = await fetch(fileUrl, {
      headers: { Accept: "application/pdf,*/*" },
      redirect: "manual",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan di storage" },
        // Redirect (3xx) yang tidak diikuti dianggap gagal upstream
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const declaredSize = Number(upstream.headers?.get?.("content-length") || 0);
    if (declaredSize > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json({ error: "Ukuran dokumen terlalu besar" }, { status: 413 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_DOWNLOAD_BYTES) {
      return NextResponse.json({ error: "Ukuran dokumen terlalu besar" }, { status: 413 });
    }
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Document download proxy error:", err);
    return NextResponse.json({ error: "Gagal mengunduh dokumen" }, { status: 500 });
  }
}
