// app/api/auth/forgot-password/route.js

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendResetPasswordEmail } from '@/lib/email';

const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 3;

  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (now - record.startTime > windowMs) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    // Normalisasi sama seperti register/login (email disimpan lowercase)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { error: 'Email wajib diisi' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // 🔒 RESPONSE GENERIC (default)
    const genericMessage = 'Jika email terdaftar, link reset telah dikirim.';

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const emailResult = await sendResetPasswordEmail({ to: user.email, resetUrl });
    if (emailResult && emailResult.success === false) {
      // Respons tetap generik (anti user-enumeration), tapi kegagalan dicatat di server
      console.error('Forgot Password: gagal mengirim email reset');
    }

    // ✅ DEV LOKAL SAJA: kirim resetUrl (tidak pernah di production/preview/test)
    return NextResponse.json({
      message: genericMessage,
      ...(process.env.NODE_ENV === 'development' && { resetUrl }),
    });

  } catch (error) {
    console.error('Forgot Password Error:', error);

    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}