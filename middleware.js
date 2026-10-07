import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // <-- IMPORT PUSTAKA KEAMANAN

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Proteksi CSRF: request yang mengubah data dari browser wajib berasal dari origin sendiri.
// Request server-to-server (mis. webhook Midtrans) tidak membawa header Origin → tetap lolos.
function isCrossOriginMutation(request) {
  const method = request.method;
  if (!method || SAFE_METHODS.includes(method)) return false;

  const origin = request.headers?.get?.('origin');
  if (!origin) return false;

  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true; // Origin tidak valid → tolak
  }
}

async function getTokenRole(token) {
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, encodedSecret, { algorithms: ['HS256'] });
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  // 1. Ambil "ID Card" (token JWT) dari Cookies
  const token = request.cookies.get('token')?.value;
  const pathname = request.nextUrl.pathname;

  // 1a. Tolak request API yang mengubah data dari situs lain (CSRF)
  if (pathname.startsWith('/api') && isCrossOriginMutation(request)) {
    return NextResponse.json({ error: 'Forbidden: cross-origin request' }, { status: 403 });
  }

  // 1b. Halaman panel admin hanya untuk ADMIN (data tetap dilindungi API, ini menyembunyikan UI)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const role = await getTokenRole(token);
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/chatbot', request.url));
    }
  }

  // 2. Proteksi Lorong Endpoint API Admin
  if (request.nextUrl.pathname.startsWith('/api/admin')) {

    // Jika tidak bawa ID Card sama sekali, tolak
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Harap login terlebih dahulu' },
        { status: 401 }
      );
    }

    try {
      // 3. Ambil "Stempel Rahasia" dari environment (biasanya di file .env)
      // Secara default biasanya process.env.JWT_SECRET
      if (!process.env.JWT_SECRET) {
        console.error('[MIDDLEWARE] JWT_SECRET tidak di-set di environment!');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      const secretKey = process.env.JWT_SECRET;

      // jose mewajibkan secret key diubah ke format Uint8Array
      const encodedSecret = new TextEncoder().encode(secretKey);

      // 4. VERIFIKASI HOLOGRAM & BACA ISI (Ini yang bikin AMAN 100%)
      // jwtVerify akan mengecek apakah token ini benar-benar dicetak oleh aplikasi kita,
      // bukan token palsu buatan hacker.
      const { payload } = await jwtVerify(token, encodedSecret, { algorithms: ['HS256'] });

      // 5. Cek Jabatan (Role)
      if (payload.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Forbidden: Admin access only' },
          { status: 403 }
        );
      }

    } catch (error) {
      // Jika tokennya palsu, hologramnya salah, atau sudah expired
      console.error('[MIDDLEWARE_ERROR] Token tidak valid:', error.message);
      return NextResponse.json(
        { error: 'Unauthorized: Token tidak valid atau sudah kedaluwarsa' },
        { status: 401 }
      );
    }
  }

  // Jika semua pengecekan aman, silakan lewat!
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}