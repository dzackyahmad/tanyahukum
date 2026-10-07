// app/api/admin/users/[id]
// Hapus user
// Update user

// app/api/users/[id]/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAdmin, SAFE_USER_SELECT, EMAIL_REGEX, validateUserAdminFields, isSafeHttpUrl } from '@/lib/security';

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    // Cegah admin menghapus akunnya sendiri (risiko terkunci dari panel admin)
    if (id === auth.user.id) {
      return NextResponse.json({ error: "Tidak bisa menghapus akun Anda sendiri dari panel admin" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 });
    // return NextResponse.json({ message: "User berhasil dihapus" }, { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error.code);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "Tidak bisa menghapus user karena masih memiliki data terkait" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    // Validasi UUID (sama seperti logic DELETE-mu)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const fieldError = validateUserAdminFields(body);
    if (fieldError) {
      return NextResponse.json({ error: fieldError }, { status: 400 });
    }

    // Cegah admin menurunkan role akunnya sendiri (risiko tidak ada admin tersisa)
    if (id === auth.user.id && body.role && body.role !== 'ADMIN') {
      return NextResponse.json({ error: "Tidak bisa menurunkan role akun Anda sendiri" }, { status: 400 });
    }

    // avatarUrl (jika diisi) harus URL http/https
    if (body.avatarUrl && !isSafeHttpUrl(body.avatarUrl)) {
      return NextResponse.json({ error: "URL Avatar tidak valid" }, { status: 400 });
    }

    // Normalisasi email (jika diubah) agar konsisten dengan register/login
    let email;
    if (body.email !== undefined && body.email !== null && body.email !== '') {
      email = String(body.email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
      }
    }

    // Update data di database
    const updatedUser = await prisma.user.update({
      where: { id: id },
      // Jangan kirim passwordHash/resetToken ke client
      select: SAFE_USER_SELECT,
      data: {
        role: body.role,
        tier: body.tier,
        promptLimit: body.promptLimit ?? undefined,
        email,
        name: body.name, // PERBAIKAN: Tambahkan ini agar nama bisa diedit!
        avatarUrl: body.avatarUrl,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal mengupdate user" }, { status: 500 });
  }
}
