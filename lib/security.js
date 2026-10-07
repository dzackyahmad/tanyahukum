// lib/security.js
// Helper keamanan bersama untuk route API.

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Field User yang aman dikirim ke client (tanpa passwordHash / resetToken).
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  tier: true,
  promptLimit: true,
  authProvider: true,
  createdAt: true,
  updatedAt: true,
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nilai yang boleh di-assign admin ke user (role 'AI' hanya untuk penulis pesan chat)
export const ASSIGNABLE_ROLES = ['USER', 'ADMIN'];
export const ASSIGNABLE_TIERS = ['FREE', 'PRO'];

// Validasi role/tier/promptLimit dari input admin. Mengembalikan pesan error atau null.
export function validateUserAdminFields({ role, tier, promptLimit }) {
  if (role !== undefined && role !== null && !ASSIGNABLE_ROLES.includes(role)) {
    return 'Role tidak valid';
  }
  if (tier !== undefined && tier !== null && !ASSIGNABLE_TIERS.includes(tier)) {
    return 'Tier tidak valid';
  }
  if (
    promptLimit !== undefined && promptLimit !== null &&
    (!Number.isInteger(promptLimit) || promptLimit < 0 || promptLimit > 100000)
  ) {
    return 'Prompt limit tidak valid';
  }
  return null;
}

// Lapisan kedua di belakang middleware: cek sesi DAN role terbaru dari database,
// sehingga admin yang sudah di-demote/dihapus langsung kehilangan akses.
// Pemakaian: const auth = await requireAdmin(); if (auth.error) return auth.error;
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.userId) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu' },
        { status: 401 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    return {
      error: NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 }),
    };
  }

  return { session, user };
}

// Untuk link yang diketik manual: "kompas.com/x" → "https://kompas.com/x".
// Mengembalikan URL http(s) yang valid, atau null jika skemanya berbahaya/tidak valid.
export function normalizeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let url = value.trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  return isSafeHttpUrl(url) ? url : null;
}

// Hanya izinkan URL http(s) — mencegah `javascript:` / `data:` URL tersimpan di DB.
export function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}
