import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Modul Setoran Juz Baru (Pembimbing Halaqoh)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('memuat halaman setoran juz baru dengan kolom STATUS dan PROSES', async ({ page }) => {
    await page.goto('/tahfidz/umum/juz-baru');

    // Verifikasi judul dan deskripsi halaman
    await expect(page.getByRole('heading', { name: /Setoran Juz Baru \(Pembimbing Halaqoh\)/i })).toBeVisible();
    await expect(page.getByText(/Pencatatan dan pemantauan proses setoran hafalan Juz Baru/i)).toBeVisible();

    // Beralih ke Mode Tampilan Tabel
    const tableModeBtn = page.getByRole('button', { name: /Tabel/i });
    if (await tableModeBtn.isVisible()) {
      await tableModeBtn.click();
    }

    // Verifikasi kolom-kolom baru pada tabel utama
    const tableHeader = page.locator('thead');
    await expect(tableHeader.getByText('NO', { exact: true })).toBeVisible();
    await expect(tableHeader.getByText('NAMA', { exact: true })).toBeVisible();
    await expect(tableHeader.getByText('STATUS', { exact: true })).toBeVisible();
    await expect(tableHeader.getByText('KAMAR', { exact: true })).toBeVisible();
    await expect(tableHeader.getByText('HALAQOH', { exact: true })).toBeVisible();
    await expect(tableHeader.getByText('PROSES', { exact: true })).toBeVisible();

    // Verifikasi bahwa kolom Jan - Des lama TIDAK ADA di tabel mode Juz Baru
    await expect(tableHeader.getByText('JAN', { exact: true })).not.toBeVisible();
    await expect(tableHeader.getByText('DES', { exact: true })).not.toBeVisible();
    await expect(tableHeader.getByText('TOTAL SETORAN', { exact: true })).not.toBeVisible();

    // Klik santri pertama pada tabel untuk membuka modal "Detail Setoran Juz Baru"
    const firstSantriBtn = page.locator('tbody tr td button').first();
    await expect(firstSantriBtn).toBeVisible();
    await firstSantriBtn.click();

    // Verifikasi modal detail terbuka
    const modalTitle = page.getByRole('heading', { name: 'Detail Setoran Juz Baru' });
    await expect(modalTitle).toBeVisible();

    // Verifikasi bagian Capaian Setoran Juz Baru
    await expect(page.getByText(/Capaian Setoran Juz Baru:/i)).toBeVisible();

    // Verifikasi bagian Proses Setoran (bukan kotak Jan s/d Des)
    await expect(page.getByRole('heading', { name: 'Proses Setoran' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Riwayat Setor' })).toBeVisible();

    // Verifikasi form input Tambah Halaman
    await expect(page.getByPlaceholder('1, 2, 5, 13...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan Setoran/i })).toBeVisible();

    // Tutup dialog modal
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(modalTitle).not.toBeVisible();
  });
});
