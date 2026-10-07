// lib/auth.js  ← file baru (pindahkan dari login/route.js)
// Token digital disimpan di browser user agar  tetap bisa mengakses fitur aplikasi tanpa harus login terus-menerus selama 7 hari.

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function createToken(payload) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function getSession() {
  // Samakan nama cookie-nya: 'token' (sesuai login/route.js)
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value; 
  
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    // Kunci algoritma ke HS256 (tolak token dengan algoritma lain)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    
    // Payload ini sekarang otomatis berisi { userId, email, tier, role } 
    // karena sudah dikirim dari login/route.js
    return payload;
  } catch (err) {
    return null;
  }
}
