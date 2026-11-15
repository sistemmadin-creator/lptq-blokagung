import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAsAdmin } from './helpers/auth';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yiwqgdqizdzsgikjlwoq.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd3FnZHFpemR6c2dpa2psd29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQxMDgyMSwiZXhwIjoyMTA3OTg2ODIxfQ.aF_tNdSjyF-Dg92HXYblZ9PmO2U0qtWgBmRTYkJnvpA';

test.describe('Pengembangan Khotmil: Input Per Halaqoh & Pindah 15 -> 30 Juz', () => {
  test.use({ navigationTimeout: 30_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('switch Input Per Halaqoh berfungsi di Pendaftaran Khotmil 15 Juz dan 30 Juz', async ({
    page,
  }) => {
    for (const url of ['/tahfidz/khotmil/15', '/tahfidz/khotmil/30']) {
      await page.goto(url);

      const daftarBtn = page.getByRole('button', { name: 'Daftar Santri Khotmil' }).first();
      await expect(daftarBtn).toBeVisible({ timeout: 20_000 });

      await expect(async () => {
        await daftarBtn.click();
        await expect(
          page.getByRole('dialog').getByRole('heading', { name: /Pendaftaran Santri - Tahfidz Khotmil/i })
        ).toBeVisible({ timeout: 1500 });
      }).toPass({ timeout: 10_000 });

      const modal = page.getByRole('dialog');
      const switchBtn = modal.getByRole('switch', { name: /Input Per Halaqoh/i });
      await expect(switchBtn).toBeVisible();
      await expect(switchBtn).toHaveAttribute('aria-checked', 'false');

      // Aktifkan mode Input Per Halaqoh
      await switchBtn.click();
      await expect(switchBtn).toHaveAttribute('aria-checked', 'true');
      await expect(modal.getByText(/Mode Per Halaqoh aktif:/i)).toBeVisible();
      await expect(modal.getByText(/Pilih Semua Halaqoh/i)).toBeVisible();

      // Pastikan daftar halaqoh muncul dan centang 1 halaqoh memilih seluruh anggotanya
      const firstHalaqohCheckbox = modal.getByRole('checkbox', { name: /^Pilih Halaqoh /i }).first();
      await expect(firstHalaqohCheckbox).toBeVisible({ timeout: 15_000 });
      if (await firstHalaqohCheckbox.isEnabled()) {
        await firstHalaqohCheckbox.check();
        await expect(modal.getByText(/^[1-9]\d* dipilih$/).first()).toBeVisible();
        await firstHalaqohCheckbox.uncheck();
        await expect(modal.getByText(/^0 dipilih$/).first()).toBeVisible();
      }

      // Expand halaqoh pertama & klik salah satu santri untuk cek preview panel kanan tetap bekerja
      const firstGroupButton = modal.locator('button', { hasText: /\d+ santri/i }).first();
      await firstGroupButton.click();
      await expect(modal.getByText(/Riwayat Santri Terpilih/i)).toBeVisible();

      // Matikan switch kembali ke mode satuan
      await switchBtn.click();
      await expect(switchBtn).toHaveAttribute('aria-checked', 'false');
      await expect(modal.getByText(/Pilih Semua \(/i)).toBeVisible();

      await modal.getByRole('button', { name: 'Batal' }).click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('perpindahan santri dari Khotmil 15 Juz ke Khotmil 30 Juz membawa nilai Tahap 1-4 dan menghapus data lama di 15 Juz', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Pengujian roundtrip mutasi database dijalankan pada desktop chromium agar aman dari race paralel.');

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Cari 1 santri yang benar-benar belum ada di khotmil15 maupun khotmil30
    const [santriRes, pesertaRes, nilaiRes] = await Promise.all([
      admin.from('santri').select('id, kode, nama_lengkap').limit(100),
      admin.from('khotmil_peserta').select('santri_id'),
      admin.from('khotmil_nilai').select('santri_id'),
    ]);

    expect(santriRes.error).toBeNull();
    const usedIds = new Set<string>([
      ...(pesertaRes.data || []).map((r) => String(r.santri_id)),
      ...(nilaiRes.data || []).map((r) => String(r.santri_id)),
    ]);

    const candidate = (santriRes.data || []).find((s) => !usedIds.has(String(s.id)));
    expect(candidate).toBeTruthy();
    const testSantri = candidate!;

    try {
      // 1. Daftarkan santri ke Khotmil 15 Juz melalui modal Pendaftaran
      await page.goto('/tahfidz/khotmil/15');
      await page.getByRole('button', { name: 'Daftar Santri Khotmil' }).first().click();

      const daftarModal = page.getByRole('dialog');
      await expect(daftarModal).toBeVisible();
      await daftarModal
        .getByPlaceholder(/Cari berdasarkan Nama, Halaqoh, Pembimbing, atau Kamar/i)
        .fill(testSantri.kode || testSantri.nama_lengkap);

      const santriCheckbox = daftarModal.getByRole('checkbox', {
        name: `Pilih santri ${testSantri.nama_lengkap}`,
      });
      await expect(santriCheckbox).toBeVisible({ timeout: 15_000 });
      await santriCheckbox.check();

      await daftarModal.getByRole('button', { name: /Daftarkan \(1\) Santri/i }).click();
      await expect(daftarModal).not.toBeVisible({ timeout: 15_000 });

      // 2. Pastikan santri tampil di tabel Khotmil 15 Juz, isi nilai Juz 1 = 92
      await page.getByPlaceholder(/Cari nama atau kode santri/i).fill(testSantri.kode);
      const row15 = page.locator('tbody tr').filter({ hasText: testSantri.nama_lengkap }).first();
      await expect(row15).toBeVisible({ timeout: 15_000 });

      const juz1Input15 = row15.locator('input[type="number"]').first();
      await juz1Input15.fill('92');
      await juz1Input15.blur();
      await expect(page.getByText(/Nilai Juz 1 .*: 92 berhasil disimpan/i)).toBeVisible({ timeout: 15_000 });

      // 3a. Cek tombol per baris "30 Juz" membuka modal dengan santri otomatis terpilih
      await row15.getByRole('button', { name: '30 Juz' }).click();
      const rowTransferModal = page.getByRole('dialog');
      await expect(
        rowTransferModal.getByRole('heading', { name: /Pindahkan Santri ke Khotmil 30 Juz/i })
      ).toBeVisible();
      await expect(rowTransferModal.getByText(/1 santri dipilih/i)).toBeVisible();
      await rowTransferModal.getByRole('button', { name: 'Batal' }).click();
      await expect(rowTransferModal).not.toBeVisible();

      // 3b. Buka modal pindah banyak santri sekaligus dari tombol toolbar "Pindah 30 Juz"
      await page.getByRole('button', { name: 'Pindah ke Khotmil 30 Juz' }).click();
      const transferModal = page.getByRole('dialog');
      await expect(
        transferModal.getByRole('heading', { name: /Pindahkan Santri ke Khotmil 30 Juz/i })
      ).toBeVisible();

      // Verifikasi default checkbox "Bawa & salin nilai Tahap 1–4" aktif
      const carryOverCheckbox = transferModal.getByRole('checkbox', {
        name: /Bawa & salin nilai Tahap 1–4 yang sudah ada ke Khotmil 30 Juz/i,
      });
      await expect(carryOverCheckbox).toBeChecked();

      // Pilih santri uji dan pastikan badge Tahap 1 (1 nilai) terbaca
      await transferModal
        .getByPlaceholder(/Cari santri berdasarkan nama, kode, halaqoh, atau kamar/i)
        .fill(testSantri.kode);
      const transferRow = transferModal.locator('label').filter({ hasText: testSantri.nama_lengkap }).first();
      await expect(transferRow).toBeVisible({ timeout: 15_000 });
      await expect(transferRow.getByText(/Tahap 1 \(1 nilai\)/i)).toBeVisible({ timeout: 15_000 });
      await transferRow.locator('input[type="checkbox"]').check();

      await transferModal.getByRole('button', { name: /Pindahkan \(1\) Santri/i }).click();
      await expect(transferModal).not.toBeVisible({ timeout: 15_000 });

      // 4. Pastikan santri sudah terhapus dari Khotmil 15 Juz
      await expect(row15).not.toBeVisible({ timeout: 15_000 });

      // 5. Buka Khotmil 30 Juz & verifikasi santri masuk beserta nilai Juz 1 = 92
      await page.goto('/tahfidz/khotmil/30');
      await page.getByPlaceholder(/Cari nama atau kode santri/i).fill(testSantri.kode);
      const row30 = page.locator('tbody tr').filter({ hasText: testSantri.nama_lengkap }).first();
      await expect(row30).toBeVisible({ timeout: 15_000 });

      const juz1Input30 = row30.locator('input[type="number"]').first();
      await expect(juz1Input30).toHaveValue('92');

      // 6. Verifikasi aturan auto-skip di Input Per Halaqoh: santri aktif di 30 Juz dilewati otomatis saat pilih halaqoh di 15 Juz, tapi tetap bisa dipilih manual
      await page.goto('/tahfidz/khotmil/15');
      await page.getByRole('button', { name: 'Daftar Santri Khotmil' }).first().click();
      const daftar15Again = page.getByRole('dialog');
      await daftar15Again.getByRole('switch', { name: /Input Per Halaqoh/i }).click();
      await daftar15Again
        .getByPlaceholder(/Cari berdasarkan Nama, Halaqoh, Pembimbing, atau Kamar/i)
        .fill(testSantri.kode);

      const halaqohGroupChk = daftar15Again.getByRole('checkbox', { name: /^Pilih Halaqoh /i }).first();
      const manualSantriChk = daftar15Again.getByRole('checkbox', {
        name: `Pilih santri ${testSantri.nama_lengkap}`,
      });
      await expect(daftar15Again.getByText('Aktif di 30 Juz').first()).toBeVisible({ timeout: 15_000 });

      if (await halaqohGroupChk.isEnabled()) {
        await halaqohGroupChk.check();
        await expect(manualSantriChk).not.toBeChecked();
      }
      await manualSantriChk.check();
      await expect(manualSantriChk).toBeChecked();
      await daftar15Again.getByRole('button', { name: 'Batal' }).click();
    } finally {
      // Bersihkan data uji agar database kembali bersih seperti sebelum test
      await admin.from('khotmil_peserta').delete().eq('santri_id', testSantri.id);
      await admin.from('khotmil_nilai').delete().eq('santri_id', testSantri.id);
    }
  });
});
