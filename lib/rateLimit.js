// pertahanan serangan brute-force
// Catatan: cache ini in-memory per instance server. Untuk proteksi lintas instance
// (mis. Vercel serverless) gunakan store bersama seperti Redis/Upstash.

import { LRUCache } from 'lru-cache';

const rateLimitCache = new LRUCache({
  max: 5000,
  ttl: 60 * 1000, // 1 menit
});

// `scope` memisahkan bucket per endpoint (mis. 'login' vs 'register'),
// supaya request ke satu endpoint tidak menghabiskan kuota endpoint lain.
export function rateLimit(ip, maxRequests = 5, scope = 'default') {
  const key = `rate_limit_${scope}_${ip}`;
  const current = rateLimitCache.get(key) ?? 0;

  if (current >= maxRequests) {
    return false; // Ditolak
  }

  rateLimitCache.set(key, current + 1);
  return true; // Diizinkan
}

// Ambil IP client dari header proxy (Vercel mengisi x-forwarded-for).
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
