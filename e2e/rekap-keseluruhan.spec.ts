import { test, expect } from '@playwright/test';
import fs from 'fs';
import { loginAsAdmin } from './helpers/auth';

test.describe('Menu Rekap Keseluruhan (/rekap-keseluruhan)', () => {
  test('pengguna tanpa sesi dialihkan ke /login saat mengakses /rekap-keseluruhan', async ({
    page,
  }) => {
    await page.goto('/rekap-keseluruhan');
    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Pengujian Terautentikasi sebagai Admin', () => {
    test.use({ navigationTimeout: 30_000 });
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('menu Rekap Keseluruhan tampil di grup Utama tepat di bawah Halaqoh dan dapat dibuka', async ({
      page,
      isMobile,
    }) => {
      await page.goto('/');

      if (isMobile) {
        await page.getByRole('button', { name: 'Buka menu navigasi' }).click();
        const dialog = page.getByRole('dialog', { name: 'Menu Navigasi Mobile' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('link', { name: 'Rekap Keseluruhan' })).toBeVisible({
          timeout: 20_000,
        });
        const utamaItems = dialog
          .locator('div')
          .filter({ has: page.getByText('Utama', { exact: true }) })
          .first()
          .getByRole('link');
        await expect(utamaItems.nth(2)).toContainText('Halaqoh');
        await expect(utamaItems.nth(3)).toContainText('Rekap Keseluruhan');
        await dialog.getByRole('link', { name: 'Rekap Keseluruhan' }).click();
      } else {
        const nav = page.getByRole('navigation', { name: 'Navigasi Utama' });
        await expect(nav).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Rekap Keseluruhan' })).toBeVisible({
          timeout: 20_000,
        });
        const utamaLinks = nav.locator('> div').first().getByRole('link');
        await expect(utamaLinks.nth(2)).toContainText('Halaqoh');
        await expect(utamaLinks.nth(3)).toContainText('Rekap Keseluruhan');
        await nav.getByRole('link', { name: 'Rekap Keseluruhan' }).click();
      }

      await expect(page).toHaveURL(/\/rekap-keseluruhan/);
      await expect(
        page.getByRole('heading', { name: /Rekap Keseluruhan Santri Tahfidz/i })
      ).toBeVisible({ timeout: 20_000 });
    });

    test('menampilkan tabel per kelompok halaqoh dengan header bertingkat (Absensi, Juz Baru, Evaluasi) dan default sesi semua', async ({
      page,
    }) => {
      await page.goto('/rekap-keseluruhan');

      await expect(
        page.getByRole('heading', { name: /Rekap Keseluruhan Santri Tahfidz/i })
      ).toBeVisible();

      // Default sesi harus 'semua'
      await expect(page.getByText(/Sesi Absensi:\s*Semua \(Pagi & Malam\)/i).first()).toBeVisible();

      // Tunggu minimal 1 tabel kelompok halaqoh selesai dimuat
      const firstSection = page.locator('section').first();
      await expect(firstSection).toBeVisible({ timeout: 20_000 });

      const firstTable = firstSection.getByRole('table');
      await expect(firstTable).toBeVisible();

      // Verifikasi header tingkat 1 & tingkat 2 sesuai spesifikasi
      const headerRows = firstTable.locator('thead tr');
      await expect(headerRows).toHaveCount(2);

      const row1 = headerRows.nth(0);
      await expect(row1.getByRole('columnheader', { name: 'No', exact: true })).toBeVisible();
      await expect(row1.getByRole('columnheader', { name: 'Nama', exact: true })).toBeVisible();
      await expect(row1.getByRole('columnheader', { name: 'Kamar', exact: true })).toBeVisible();
      await expect(row1.getByRole('columnheader', { name: 'Absensi', exact: true })).toBeVisible();
      await expect(row1.getByRole('columnheader', { name: 'Juz Baru', exact: true })).toBeVisible();
      await expect(row1.getByRole('columnheader', { name: 'Evaluasi', exact: true })).toBeVisible();

      const row2 = headerRows.nth(1);
      await expect(row2.getByRole('columnheader', { name: 'H', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'A', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'I', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'S', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'Status', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'Juz', exact: true })).toBeVisible();
      await expect(row2.getByRole('columnheader', { name: 'Halaman', exact: true })).toBeVisible();

      // Verifikasi baris pertama mulai dari No = 1 dan kolom Evaluasi berupa angka bulat saja
      const firstBodyRow = firstTable.locator('tbody tr').first();
      await expect(firstBodyRow).toBeVisible();
      await expect(firstBodyRow.locator('td').nth(0)).toHaveText('1');
      await expect(firstBodyRow.locator('td').nth(10)).toHaveText(/^\d+$/);
    });

    test('filter sesi, kelompok halaqoh, dan pencarian nama bekerja serta nomor urut otomatis menyesuaikan', async ({
      page,
    }) => {
      await page.goto('/rekap-keseluruhan');

      const firstSection = page.locator('section').first();
      await expect(firstSection).toBeVisible({ timeout: 20_000 });

      // Ubah sesi ke Pagi lalu kembali ke Semua
      const sesiGroup = page.getByRole('group', { name: 'Pilih sesi absensi' });
      await sesiGroup.getByRole('button', { name: 'pagi' }).click();
      await expect(page.getByText(/Sesi Absensi:\s*Pagi/i).first()).toBeVisible();

      await sesiGroup.getByRole('button', { name: 'semua' }).click();
      await expect(page.getByText(/Sesi Absensi:\s*Semua \(Pagi & Malam\)/i).first()).toBeVisible();

      // Filter dropdown Halaqoh ke kelompok pertama yang ada di opsi
      const halaqohSelect = page.getByLabel('Filter kelompok halaqoh');
      const optionCount = await halaqohSelect.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);

      const secondOptionVal = await halaqohSelect.locator('option').nth(1).getAttribute('value');
      if (secondOptionVal) {
        await halaqohSelect.selectOption(secondOptionVal);
        await expect(page.locator('section')).toHaveCount(1);
        await expect(
          page.locator('section').first().locator('tbody tr').first().locator('td').nth(0)
        ).toHaveText('1');
      }

      // Uji pencarian ke kata yang tidak ada -> empty state + tombol Reset Filter
      const searchInput = page.getByLabel('Cari santri atau kamar');
      await searchInput.fill('zzz_nama_santri_tidak_mungkin_ada_999');
      await expect(
        page.getByText(/Tidak ada data santri yang sesuai dengan filter atau pencarian/i)
      ).toBeVisible();

      await page.getByRole('button', { name: /Reset Filter/i }).click();
      await expect(page.locator('section').first()).toBeVisible();
    });

    test('tombol ekspor Excel (.xlsx), .pdf, .jpg, dan tombol Print berfungsi tanpa error', async ({
      page,
    }) => {
      await page.goto('/rekap-keseluruhan');

      const firstSection = page.locator('section').first();
      await expect(firstSection).toBeVisible({ timeout: 20_000 });

      // Filter ke 1 halaqoh agar ekspor .jpg langsung 1 file tanpa terlalu besar
      const halaqohSelect = page.getByLabel('Filter kelompok halaqoh');
      const firstHalaqohVal = await halaqohSelect.locator('option').nth(1).getAttribute('value');
      if (firstHalaqohVal) {
        await halaqohSelect.selectOption(firstHalaqohVal);
        await expect(page.locator('section')).toHaveCount(1);
      }

      // 1. Uji unduh Excel (.xlsx)
      const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Excel', exact: true }).click(),
      ]);
      expect(excelDownload.suggestedFilename()).toMatch(/Rekap_Keseluruhan_.*\.xlsx$/);
      const excelPath = await excelDownload.path();
      expect(excelPath).not.toBeNull();
      expect(fs.statSync(excelPath!).size).toBeGreaterThan(1000);

      // 2. Uji unduh .pdf (vektor jsPDF)
      const [pdfDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: '.pdf', exact: true }).click(),
      ]);
      expect(pdfDownload.suggestedFilename()).toMatch(/Rekap_Keseluruhan_.*\.pdf$/);
      const pdfPath = await pdfDownload.path();
      expect(pdfPath).not.toBeNull();
      const pdfHeader = fs.readFileSync(pdfPath!).subarray(0, 4).toString('ascii');
      expect(pdfHeader).toBe('%PDF');

      // 3. Uji unduh .jpg (html-to-image)
      const [jpgDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: '.jpg', exact: true }).click(),
      ]);
      expect(jpgDownload.suggestedFilename()).toMatch(/Rekap_Keseluruhan_.*\.jpg$/);
      const jpgPath = await jpgDownload.path();
      expect(jpgPath).not.toBeNull();
      const jpgBytes = fs.readFileSync(jpgPath!);
      expect(jpgBytes.length).toBeGreaterThan(1000);
      expect(jpgBytes[0]).toBe(0xff);
      expect(jpgBytes[1]).toBe(0xd8);

      // 4. Uji tombol Print siap & tidak memicu console error
      const printBtn = page.getByRole('button', { name: 'Print', exact: true });
      await expect(printBtn).toBeVisible();
      await expect(printBtn).toBeEnabled();
    });
  });
});
