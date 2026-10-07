import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Opsi hapus cookie JWT (auth utama pakai JWT, bukan hanya Supabase)
const CLEAR_TOKEN_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  expires: new Date(0),
};

/**
 * POST: Menghapus sesi pengguna (Logout)
 */
export async function POST(request) {
  // 1. Sign out Supabase (opsional). Kegagalan di sini TIDAK boleh
  //    menghalangi penghapusan cookie JWT di bawah.
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Sign out secara global (menghapus session di server Supabase)
      await supabase.auth.signOut({ scope: 'global' });
    }
  } catch (error) {
    console.error("[LOGOUT_SUPABASE_ERROR]:", error?.message);
  }

  // 2. Selalu hapus JWT cookie, lalu redirect ke login
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  response.cookies.set('token', '', CLEAR_TOKEN_COOKIE);

  return response;
}
