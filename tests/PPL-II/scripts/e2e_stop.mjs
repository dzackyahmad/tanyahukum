// Uji tombol Stop end-to-end: kirim pertanyaan, batalkan setelah teks pertama muncul,
// lalu pastikan tidak ada chat/pesan yang tersimpan di akun uji.
// Pemakaian (dari folder tanyahukum/, server lokal harus menyala): node tests/PPL-II/scripts/e2e_stop.mjs
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
const require = createRequire(process.cwd() + '/package.json');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { SignJWT } = await import(pathToFileURL(process.cwd() + '/node_modules/jose/dist/webapi/index.js').href);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: 'test@mail.com' } });
const token = await new SignJWT({ userId: user.id, email: user.email, tier: user.tier, role: user.role })
  .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m')
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const before = await prisma.chatHistory.count({ where: { userId: user.id } });
const controller = new AbortController();
const t0 = performance.now();
let firstText = null, stoppedAt = null;
try {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST', signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Cookie: `token=${token}` },
    body: JSON.stringify({ message: 'Apa saja kewajiban pemberi kerja terhadap penyandang disabilitas?', stream: true, mode: 'fast' }),
  });
  const reader = res.body.getReader(); const dec = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    if (dec.decode(value).includes('"type":"text"') && firstText === null) {
      firstText = performance.now() - t0;
      controller.abort(); // = pengguna menekan Stop
      stoppedAt = performance.now() - t0;
    }
  }
} catch (e) {
  if (e.name !== 'AbortError') throw e;
}
await new Promise((r) => setTimeout(r, 8000)); // beri waktu server bila (salah) menyimpan
const after = await prisma.chatHistory.count({ where: { userId: user.id } });
const chats = await prisma.chat.count({ where: { userId: user.id } });
console.log(`Teks pertama ${(firstText / 1000).toFixed(1)} dtk -> Stop ditekan ${(stoppedAt / 1000).toFixed(1)} dtk`);
console.log(`Pesan tersimpan sebelum: ${before}, sesudah: ${after} | chat di akun uji: ${chats} -> ${after === before && chats === 0 ? 'LULUS (tidak ada yang disimpan)' : 'GAGAL'}`);
await prisma.$disconnect();
