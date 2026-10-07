import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// Inisialisasi Google Client menggunakan ID dari .env
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(request) {
  try {
    if (!rateLimit(getClientIp(request), 10, 'google-login')) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.' },
        { status: 429 }
      );
    }

    // Fail-closed: tanpa GOOGLE_CLIENT_ID, verifikasi audience dilewati oleh library
    // sehingga ID token dari aplikasi Google lain bisa diterima.
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('[GOOGLE-AUTH] GOOGLE_CLIENT_ID tidak di-set di environment!');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { credentialToken } = await request.json();

    if (!credentialToken) {
      return NextResponse.json({ error: 'Token Google tidak ditemukan' }, { status: 400 });
    }

    // 1. Verifikasi keaslian token ke server Google
    const ticket = await client.verifyIdToken({
      idToken: credentialToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // 2. Ambil data user dari tiket Google
    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      return NextResponse.json({ error: 'Gagal mendapatkan email dari Google' }, { status: 400 });
    }

    // Jangan tautkan ke akun yang ada jika Google belum memverifikasi email ini
    if (payload.email_verified === false) {
      return NextResponse.json({ error: 'Email Google belum terverifikasi' }, { status: 403 });
    }

    // 3. Cek apakah user dengan email ini sudah ada di database kita
    let user = await prisma.user.findUnique({
      where: { email: email }
    });

    // 4. Jika user belum ada, daftarkan secara otomatis (Register)
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          name: name,
          avatarUrl: picture,
          authProvider: 'GOOGLE',
          tier: 'FREE', // Default
          role: 'USER', // Default
        }
      });
    }

    // 5. Buat JWT (Sama seperti login biasa)
    const { createToken } = await import('@/lib/auth');
    const token = await createToken({
      userId: user.id,
      email: user.email,
      tier: user.tier,
      role: user.role || 'USER',
    });

    // 6. Berhasil! Kembalikan data user + Set Cookie HttpOnly
    const response = NextResponse.json({ 
      message: 'Login Google berhasil', 
      user: { 
        id: user.id, 
        email: user.email,
        tier: user.tier,
        promptLimit: user.promptLimit,
        authProvider: user.authProvider,
        role: user.role || 'USER',
        name: user.name,
        avatarUrl: user.avatarUrl
      }
    }, { status: 200 });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;

  } catch (error) {
    console.error("Google Login Error:", error?.message);
    return NextResponse.json({ error: 'Token tidak valid atau terjadi kesalahan server' }, { status: 401 });
  }
}