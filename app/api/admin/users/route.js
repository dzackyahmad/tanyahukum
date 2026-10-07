// app/api/admin/users/route.js
// Baca semua user yang ada
// Dan create user

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { requireAdmin, SAFE_USER_SELECT, EMAIL_REGEX, validateUserAdminFields } from '@/lib/security';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
        promptLimit: true,
        createdAt: true,
        _count: {
          select: {
            messages: {
              where: {
                role: 'USER',
                createdAt: { gte: today }
              }
            }
          }
        },
        messages: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedUsers = users.map(user => ({
      ...user,
      remainingQuota: Math.max(0, user.promptLimit - (user._count?.messages || 0)),
      lastActive: user.messages?.[0]?.createdAt || null,
      _count: undefined,
      messages: undefined
    }));

    return NextResponse.json(formattedUsers, { status: 200 });
  } catch (error) {
    console.error("GET USERS ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    // PERBAIKAN: Tambahkan 'name' ke dalam destructuring
    const { email, password, role, tier, promptLimit, name } = body; 

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan Password wajib diisi" }, { status: 400 });
    }

    // Normalisasi sama seperti register/login agar user bisa login
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
    }

    const fieldError = validateUserAdminFields({ role, tier, promptLimit });
    if (fieldError) {
      return NextResponse.json({ error: fieldError }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      // Jangan kirim passwordHash/resetToken ke client
      select: SAFE_USER_SELECT,
      data: {
        email: normalizedEmail,
        name, // PERBAIKAN: Masukkan nama ke database
        passwordHash: hashedPassword, 
        role: role || 'USER',
        tier: tier || 'FREE',
        promptLimit: promptLimit || 50, 
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("CREATE USER ERROR:", error?.message);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 409 });
    }
    // Jangan ekspos detail error internal ke client
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}