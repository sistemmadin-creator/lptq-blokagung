import { test, expect } from '@playwright/test';

test.describe('Tata Letak, AppShell & Responsivitas (Layout & Responsiveness)', () => {
  test('halaman login tidak memuat sidebar sistem (AppShell terisolasi)', async ({ page }) => {
    await page.goto('/login');

    // Sidebar dan navigasi utama tidak boleh muncul di halaman login
    await expect(page.getByRole('navigation', { name: /Navigasi Utama/i })).toBeHidden();
    await expect(page.getByText('Data Santri Tahfidz')).toBeHidden();
  });

  test('tampilan responsif kartu login pada perangkat', async ({ page }) => {
    await page.goto('/login');

    const card = page.locator('div.max-w-sm');
    await expect(card).toBeVisible();

    const usernameInput = page.getByRole('textbox', { name: 'Nama Pengguna' });
    const passwordInput = page.locator('#password');
    const submitBtn = page.getByRole('button', { name: 'Masuk', exact: true });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verifikasi tombol submit berada di dalam layar dan memiliki dimensi yang memadai
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
  });
});
