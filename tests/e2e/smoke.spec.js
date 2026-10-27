const { test, expect } = require('@playwright/test');

// Halaman utama langsung dialihkan ke Chatbot (BUG-09, app/page.js)
test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/chatbot$/);
});
