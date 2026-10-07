/** @type {import('next').NextConfig} */

// Security headers untuk semua halaman & API.
// Catatan: CSP script-src ketat & COOP sengaja tidak dipasang karena Google Sign-In
// (popup/iframe) dan Midtrans Snap memuat script/iframe pihak ketiga.
const securityHeaders = [
  // Cegah clickjacking: halaman hanya boleh di-embed oleh origin sendiri
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  },
  // Cegah browser menebak tipe konten (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Jangan bocorkan path/query (mis. token reset password) ke situs lain
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Matikan akses fitur sensitif yang tidak dipakai aplikasi
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Paksa HTTPS (diabaikan browser saat diakses via http://localhost)
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

const nextConfig = {
  // Sembunyikan header "X-Powered-By: Next.js"
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
