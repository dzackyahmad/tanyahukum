// Logika login akun

// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';

// ─── Helper: validasi input ──────────────────────────────────────────────────
function validateInput(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Input tidak valid';
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return 'Format email tidak valid';
  }

  if (!password || password.length < 8) {
    return 'Password minimal 8 karakter';
  }

  return null; // valid
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
export async function POST(request) {
  try {
    // 1. Rate limiting berdasarkan IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    if (!rateLimit(ip, 5, 'login')) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    // 2. Parse & validasi body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body tidak valid' }, { status: 400 });
    }

    const { email, password } = body ?? {};
    const validationError = validateInput(email, password);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // 3. Normalisasi email
    const normalizedEmail = email.trim().toLowerCase();

    // Batasi percobaan per akun juga (brute-force dari banyak IP)
    if (!rateLimit(normalizedEmail, 10, 'login-email')) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    // 4. Cari user di database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        tier: true,
        promptLimit: true,
        role: true,
        name: true,      // <--- TAMBAHKAN INI
        avatarUrl: true, // <--- TAMBAHKAN INI
      },
    });

    // Gunakan waktu konstan agar tidak rentan timing attack
    // (bcrypt.compare tetap dijalankan meski user tidak ditemukan)
    const dummyHash = '$2a$12$dummyhashforpreventingtimingattacks.placeholder00';
    const hashToCompare = user?.passwordHash ?? dummyHash;

    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // 5. Buat JWT
    const token = await createToken({
      userId: user.id,
      email: user.email,
      tier: user.tier,
      role: user.role, // Pastikan ini 'admin' atau 'user'
    });

    // 6. Kirim response + set cookie HttpOnly
    const response = NextResponse.json(
      {
        message: 'Login berhasil',
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier,
          promptLimit: user.promptLimit,
          role: user.role,
          name: user.name,           // <--- TAMBAHKAN INI
          avatarUrl: user.avatarUrl, // <--- TAMBAHKAN INI
        },
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true, // tidak bisa diakses JS di browser → aman dari XSS
      secure: process.env.NODE_ENV === 'production', // HTTPS only di production
      sameSite: 'lax', // proteksi CSRF dasar
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;

  } catch (error) {
    // Jangan ekspos detail error ke client
    console.error('[LOGIN_ERROR]', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}