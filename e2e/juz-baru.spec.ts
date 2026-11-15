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

  test('tombol ++ membuka modal atur capaian Juz & Halaman massal per halaqoh tanpa console error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/tahfidz/umum/juz-baru');

    const bulkBtn = page.getByRole('button', { name: 'Atur Capaian Juz dan Halaman Santri' });
    const addBtn = page.getByRole('button', { name: 'Input Log Setoran' });
    await expect(bulkBtn).toBeVisible();
    await expect(addBtn).toBeVisible();

    // Pastikan tombol ++ berada di sebelah kiri tombol +
    const bulkBox = await bulkBtn.boundingBox();
    const addBox = await addBtn.boundingBox();
    expect(bulkBox).not.toBeNull();
    expect(addBox).not.toBeNull();
    if (bulkBox && addBox) {
      expect(bulkBox.x).toBeLessThan(addBox.x);
    }

    // Buka modal ++
    await bulkBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Atur Capaian Juz & Halaman Santri/i })).toBeVisible();

    // Tunggu daftar santri termuat di dalam modal
    const firstJuzInput = dialog.locator('input[aria-label^="Juz untuk "]').first();
    const firstHalamanInput = dialog.locator('input[aria-label^="Halaman untuk "]').first();
    await expect(firstJuzInput).toBeVisible();
    await expect(firstHalamanInput).toBeVisible();

    // Uji validasi halaman > 19
    await firstHalamanInput.fill('20');
    await expect(dialog.getByText(/Halaman harus 0 sampai 19/i)).toBeVisible();
    const saveBtn = dialog.getByRole('button', { name: /Simpan Perubahan/i });
    await expect(saveBtn).toBeDisabled();

    // Uji perubahan valid & penghitung perubahan
    await firstJuzInput.fill('2');
    await firstHalamanInput.fill('5');
    await expect(dialog.getByText(/1 santri siap disimpan perubahannya/i)).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    // Uji konfirmasi buang perubahan saat klik Batal lalu lanjut edit & reset
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(dialog.getByText(/Ada 1 perubahan yang belum disimpan/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Lanjut Edit' }).click();

    await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(dialog.getByText(/Belum ada perubahan nilai Juz atau Halaman/i)).toBeVisible();

    // Uji tutup dengan Escape ketika tidak ada perubahan
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    // Pastikan tombol ++ tidak muncul di halaman Evaluasi
    await page.goto('/tahfidz/umum/evaluasi');
    await expect(page.getByRole('heading', { name: /Evaluasi Hafalan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Atur Capaian Juz dan Halaman Santri' })).not.toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
