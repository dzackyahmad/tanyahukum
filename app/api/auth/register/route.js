// logika registrasi akun

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!rateLimit(ip, 10, 'register')) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi nanti.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    // 1. Validasi Input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 });
    }

    // 2. Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      if (existingUser.authProvider === 'GOOGLE') {
        return NextResponse.json({
          error: 'Email ini sudah terdaftar menggunakan Google. Silakan gunakan tombol Login with Google.'
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
    }

    // 3. Hash Password & Simpan
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
      }
    });

    return NextResponse.json({ message: 'Registrasi berhasil' }, { status: 201 });

  } catch (error) {
    console.error("Register Error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Email sudah digunakan' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}