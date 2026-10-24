import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Pembaruan Modul Flyer Khataman & WhatsApp Gateway', () => {
  test.describe('1. API Proxy WhatsApp Gateway (/api/waha)', () => {
    test('GET /api/waha/sessions/default merespons kontrak gateway secara valid', async ({ request }) => {
      const res = await request.get('/api/waha/sessions/default');
      // Berhasil proxy (200) atau respons fallback jika gateway lokal belum berjalan (502)
      expect([200, 502]).toContain(res.status());

      const data = await res.json();
      expect(data).toHaveProperty('status');
      if (res.status() === 200) {
        expect(['WORKING', 'SCAN_QR_CODE', 'STARTING']).toContain(data.status);
      }
    });
  });

  test.describe('2. Modul Flyer Khataman Al-Qur\'an (/alat/flyer-khataman)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('memuat halaman flyer, tombol Template Flyer (pengganti Posisi Terkunci), dan kontrol penyesuaian foto santri', async ({ page }) => {
      await page.goto('/alat/flyer-khataman');

      // Verifikasi judul halaman
      await expect(page.getByRole('heading', { name: /Flyer Khataman Al-Qur'an/i })).toBeVisible();

      // Verifikasi tombol "Template Flyer" telah menggantikan "Posisi Terkunci"
      const templateBtn = page.getByRole('button', { name: /Template Flyer/i });
      await expect(templateBtn).toBeVisible();

      // Tombol "Posisi Terkunci" lama sudah tidak boleh ada
      await expect(page.getByRole('button', { name: /Posisi Terkunci/i })).not.toBeVisible();

      // Buka modal Template Flyer dengan toleransi hidrasi React Next.js
      await expect(async () => {
        await templateBtn.click();
        await expect(page.getByRole('heading', { name: /Manajemen Template Flyer/i })).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 10000 });

      // Verifikasi pilihan template tersedia di dalam modal menggunakan heading semantic
      await expect(page.getByText(/Pilih Template yang Digunakan/i)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Template Putri (Resmi)' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Template Putra (Resmi)' })).toBeVisible();

      // Tutup modal
      await page.getByRole('button', { name: /Tutup/i }).click();
      await expect(page.getByRole('heading', { name: /Manajemen Template Flyer/i })).not.toBeVisible();

      // Unggah foto santri sampel untuk memicu kontrol penyesuaian foto & tombol Tengahkan Foto
      const dummyPngBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
      await fileInput.setInputFiles({
        name: 'santri-sample.png',
        mimeType: 'image/png',
        buffer: Buffer.from(dummyPngBase64.split(',')[1], 'base64'),
      });

      // Verifikasi tombol cepat "Tengahkan Foto" muncul setelah foto diunggah
      const centerBtn = page.getByRole('button', { name: /Tengahkan Foto/i });
      await expect(centerBtn).toBeVisible();

      // Klik tombol Tengahkan Foto
      await centerBtn.click();
      await expect(page.getByText(/Offset: 0px, 0px/i)).toBeVisible();
    });
  });

  test.describe('3. Modul Kirim WhatsApp Evaluasi & Khotmil (/alat/kirim-wa)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('memuat halaman kirim WA, bilah status sinyal, dan modal pengaturan gateway dengan area scan QR', async ({ page }) => {
      await page.goto('/alat/kirim-wa');

      // Verifikasi judul modul
      await expect(page.getByRole('heading', { name: /Kirim WhatsApp Evaluasi & Khotmil/i })).toBeVisible();

      // Verifikasi tombol aksi pada bilah kontrol atas
      const settingsBtn = page.getByRole('button', { name: /Pengaturan Gateway/i });
      const draftBtn = page.getByRole('button', { name: /Draf Pesan/i });
      await expect(settingsBtn).toBeVisible();
      await expect(draftBtn).toBeVisible();

      // Buka modal Pengaturan Gateway
      await settingsBtn.click();

      // Verifikasi modal pengaturan terbuka
      await expect(page.getByRole('heading', { name: /Pengaturan WhatsApp Gateway \(WAHA\)/i })).toBeVisible();

      // Verifikasi area status sinyal / scan QR hadir di dalam modal
      await expect(page.getByText(/Status Gateway:/i).or(page.getByText(/Scan QR Code/i)).or(page.getByText(/WhatsApp Berhasil Terhubung/i))).toBeVisible();

      // Verifikasi input URL Server WAHA dan tombol pilihan cepat
      const urlInput = page.getByPlaceholder(/Contoh: https:\/\/...trycloudflare.com atau http:\/\/localhost:3008/i);
      await expect(urlInput).toBeVisible();

      const cloudflarePresetBtn = page.getByRole('button', { name: /Cloudflare HTTPS Tunnel/i });
      const localPresetBtn = page.getByRole('button', { name: /Port Lokal \(3008\)/i });
      await expect(cloudflarePresetBtn).toBeVisible();
      await expect(localPresetBtn).toBeVisible();

      // Klik preset Port Lokal (3008) dan verifikasi nilai input terisi
      await localPresetBtn.click();
      await expect(urlInput).toHaveValue(/localhost:3008/);

      // Klik preset Cloudflare HTTPS Tunnel dan verifikasi nilai terisi dengan HTTPS
      await cloudflarePresetBtn.click();
      await expect(urlInput).toHaveValue(/trycloudflare\.com/);

      // Tutup modal
      await page.getByRole('button', { name: '✕', exact: true }).click();
      await expect(page.getByRole('heading', { name: /Pengaturan WhatsApp Gateway \(WAHA\)/i })).not.toBeVisible();
    });
  });
});
