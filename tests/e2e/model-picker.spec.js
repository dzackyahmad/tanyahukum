const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// E2E: pemilih model & mode di kotak chat (tanpa mengirim pertanyaan → tidak memakai kuota AI).
// Memakai akun uji test@mail.com; sesi dibuat dengan menandatangani JWT seperti server.
let session;

test.beforeAll(async () => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: 'test@mail.com' } });
  await prisma.$disconnect();
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ userId: user.id, email: user.email, tier: user.tier, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  session = { token, user: { id: user.id, name: user.name, email: user.email, tier: user.tier, role: user.role } };
});

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'token', value: session.token, url: baseURL }]);
  await page.addInitScript(({ user }) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem(`tanyahukum_tour_done_${user.id}`, '1');
    localStorage.setItem('hide_about_modal', 'true');
  }, session);
});

test('pemilih model: default Flash-Lite · Kilat, model di atas & mode di bawah, pilihan tersimpan', async ({ page }) => {
  await page.goto('/chatbot');

  const picker = page.locator('button[aria-haspopup="dialog"]').first();
  await expect(picker).toHaveAttribute('title', 'Gemini 3.5 Flash-Lite · Kilat');

  await picker.click();
  const menu = page.getByRole('dialog', { name: 'Pilih model dan mode' });
  await expect(menu.getByRole('listbox', { name: 'Model' }).getByRole('option')).toHaveCount(5);
  await expect(menu.getByRole('radiogroup', { name: 'Mode' }).getByRole('radio')).toHaveCount(2);

  // Pilih model (menu tetap terbuka), lalu pilih mode (menu tertutup)
  await menu.getByRole('option', { name: /Qwen 3\.8/ }).click();
  await expect(picker).toHaveAttribute('title', 'Qwen 3.8 · Kilat');
  await expect(menu.getByText('Model Groq membaca 20 potongan dokumen teratas')).toBeVisible();
  await menu.getByRole('radio', { name: /Berpikir/ }).click();
  await expect(menu).toBeHidden();
  await expect(picker).toHaveAttribute('title', 'Qwen 3.8 · Berpikir');

  expect(await page.evaluate(() => localStorage.getItem('tanyahukum_chat_mode'))).toBe('qwen-think');
  await page.reload();
  await expect(page.locator('button[aria-haspopup="dialog"]').first()).toHaveAttribute('title', 'Qwen 3.8 · Berpikir');
});

for (const vp of [{ name: 'desktop', width: 1280, height: 720 }, { name: 'HP', width: 390, height: 844 }]) {
  test(`menu model selalu di dalam layar (${vp.name} ${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/chatbot');
    await page.locator('button[aria-haspopup="dialog"]').first().click();
    const box = await page.getByRole('dialog', { name: 'Pilih model dan mode' }).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    await expect(page.getByRole('radio', { name: /Berpikir/ })).toBeInViewport();
  });
}
