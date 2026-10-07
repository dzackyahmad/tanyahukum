// Logika reset password

// src/app/api/auth/reset-password/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    // Batasi percobaan reset per IP
    if (!rateLimit(getClientIp(request), 10, 'reset-password')) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    const { token, newPassword } = await request.json();

    // 1. Validasi input
    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token dan password baru wajib diisi' },
        { status: 400 }
      );
    }

    if (typeof token !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Input tidak valid' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // 2. Hash token dari URL, lalu cocokkan dengan yang tersimpan di DB
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 3. Cari user — filter expiry langsung di query, bukan di aplikasi
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token tidak valid atau sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    // 4. Hash password baru (salt rounds 12)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5. Update password & hapus token (one-time use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json(
      { message: 'Password berhasil diubah. Silakan login kembali.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset Password Error:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}