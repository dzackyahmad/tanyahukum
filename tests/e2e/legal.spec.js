const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// E2E: halaman Kebijakan Privasi & Syarat dan Ketentuan (statis, dua bahasa) dan tautannya di Profil.

for (const doc of [
  { path: '/privacy-policy', id: 'Kebijakan Privasi', en: 'Privacy Policy', sections: 13, faq: 7 },
  { path: '/terms-of-service', id: 'Syarat dan Ketentuan Layanan', en: 'Terms of Service', sections: 15, faq: 8 },
]) {
  test(`${doc.path}: tampil sebagai dokumen, bisa ganti bahasa ID/EN, punya FAQ`, async ({ page }) => {
    await page.goto(doc.path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.id);
    await expect(page.locator('article section[id]')).toHaveCount(doc.sections + 1); // + FAQ
    await expect(page.locator('#faq details')).toHaveCount(doc.faq);

    // FAQ bisa dibuka
    const first = page.locator('#faq details').first();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');

    // Ganti ke English: judul berubah, URL & atribut lang ikut berubah
    await page.getByRole('radio', { name: 'EN' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.en);
    await expect(page).toHaveURL(/lang=en/);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');

    // Pilihan bahasa diingat
    await page.goto(doc.path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.en);
    await page.getByRole('radio', { name: 'ID' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(doc.id);
  });
}

test('halaman legal bisa dibuka tanpa login & muat di layar HP', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/terms-of-service?lang=en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms of Service');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Profil › Akun: tautan Kebijakan Privasi & Syarat dan Ketentuan membuka tab baru', async ({ page, context, baseURL }) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email: 'test@mail.com' } });
  await prisma.$disconnect();
  const { SignJWT } = await import('jose');
  const token = await new SignJWT({ userId: user.id, email: user.email, tier: user.tier, role: user.role })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  await context.addCookies([{ name: 'token', value: token, url: baseURL }]);
  await page.addInitScript((u) => {
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem(`tanyahukum_tour_done_${u.id}`, '1');
    localStorage.setItem('hide_about_modal', 'true');
  }, { id: user.id, name: user.name, email: user.email, tier: user.tier, role: user.role });

  await page.goto('/chatbot');
  await page.locator('[data-tour="profile"]').click();
  await page.getByRole('button', { name: 'Akun', exact: true }).click();
  const link = page.getByRole('link', { name: /Kebijakan Privasi/ });
  await expect(link).toHaveAttribute('target', '_blank');
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/\/privacy-policy$/);
  await expect(popup.getByRole('heading', { level: 1 })).toHaveText('Kebijakan Privasi');
  await expect(page.getByRole('link', { name: /Syarat dan Ketentuan/ })).toHaveAttribute('href', '/terms-of-service');
});
