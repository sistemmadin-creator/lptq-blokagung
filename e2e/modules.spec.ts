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

    test('memiliki tombol "Kirim WA" di header dan toolbar, serta membuka modal kirim WhatsApp dengan informasi santri', async ({ page }) => {
      await page.goto('/alat/flyer-khataman');

      // Verifikasi tombol "Kirim WA" di header atas
      const kirimWaBtn = page.getByRole('button', { name: /Kirim WA/i }).first();
      await expect(kirimWaBtn).toBeVisible();

      // Buka modal Kirim WA
      await kirimWaBtn.click();

      // Verifikasi modal terbuka dengan judul dan elemen form
      const modalHeading = page.getByRole('heading', { name: /Kirim Flyer Khataman via WhatsApp/i });
      await expect(modalHeading).toBeVisible();

      // Verifikasi komponen input nomor HP wali, textarea ucapan, dan tombol dual engine
      await expect(page.getByPlaceholder(/081234567890/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Kirim via WA Web/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Kirim Otomatis \(WAHA\)/i })).toBeVisible();

      // Tutup modal dengan tombol Batal
      await page.getByRole('button', { name: /Batal/i }).click();
      await expect(modalHeading).not.toBeVisible();
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

  test.describe('4. Modul Panduan Sistem (/pengaturan?tab=panduan)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('memuat materi panduan teknis BAB 7: alur kerja WhatsApp gateway, perbedaan tunnel vs port lokal, dan jaminan gratis', async ({ page }) => {
      await page.goto('/pengaturan?tab=panduan');

      // Verifikasi judul buku panduan (toleransi jeda jaringan Supabase profil)
      await expect(
        page.getByRole('heading', { name: /Buku Panduan & Tur Interaktif LPTQ Blokagung/i })
      ).toBeVisible({ timeout: 25000 });

      // Klik untuk memperluas BAB 7
      const bab7Button = page.getByRole('button', { name: /BAB 7.*Alat Lanjutan/i });
      await expect(bab7Button).toBeVisible();
      await bab7Button.click();

      // Verifikasi materi yang baru ditambahkan tampil lengkap
      await expect(page.getByRole('heading', { name: /Bagaimana Alur Kerjanya Kok Bisa Terhubung/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Apa Beda Pilihan.*Cloudflare HTTPS Tunnel.*Port Lokal/i })).toBeVisible();
      await expect(page.getByText('Jawabannya: TIDAK, 100% GRATIS SELAMANYA.')).toBeVisible();
      await expect(page.getByRole('heading', { name: /2 Tips Penting untuk Menjaga Nomor Tetap Aman/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Pembaruan Fitur Flyer Khataman & WhatsApp Web/i })).toBeVisible();
    });

    test('simulasi flyer khataman menampilkan avatar kartun santriwati berkerudung yang sopan', async ({ page }) => {
      await page.goto('/panduan/simulasi?tour=flyer');
      await expect(page.getByText(/Simulasi: Generator Flyer Khataman 30 Juz/i)).toBeVisible({ timeout: 15000 });

      // Verifikasi tombol unggah foto dan klik untuk memuat foto
      const uploadBtn = page.getByRole('button', { name: /Unggah Foto Santri/i }).or(page.getByRole('button', { name: /Ganti Foto Santri/i }));
      await expect(uploadBtn).toBeVisible();
      await uploadBtn.click();

      // Verifikasi gambar kartun santriwati berkerudung terpasang di background flyer
      const santriPhotoDiv = page.locator('div[style*="santriwati-kartun.png"]');
      await expect(santriPhotoDiv).toBeVisible();
    });
  });

  test.describe('5. Modul Khotmil 15 & 30 Juz - Template Excel Kolom Tabel', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('Khotmil 15 Juz: membuka modal Excel dan mengunduh template dengan format kolom tabel yang sesuai', async ({
      page,
    }) => {
      await page.goto('/tahfidz/khotmil/15');
      await expect(
        page.getByRole('heading', { name: 'Tahfidz Khotmil 15 Juz', exact: true })
      ).toBeVisible({ timeout: 15000 });

      // Buka modal Menu Excel Khotmil
      const excelBtn = page.getByRole('button', { name: /Menu Excel/i }).or(page.locator('button[title*="Excel"]')).or(page.locator('button:has(svg.lucide-file-spreadsheet)'));
      await expect(excelBtn.first()).toBeVisible();
      await excelBtn.first().click();

      // Verifikasi modal terbuka
      await expect(page.getByRole('heading', { name: /Menu Excel Khotmil/i })).toBeVisible();

      // Verifikasi tombol Template Excel Nilai (Tahap 1) dan format kolom tabel
      await expect(page.getByText(/Template Excel Nilai \(Tahap 1\)/i)).toBeVisible();
      await expect(page.getByText(/Format kolom tabel: No, Nama Santri, Asrama, Halaqoh, Juz 1 - 5/i)).toBeVisible();

      // Uji unduh template dan periksa nama berkas
      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Template Excel Nilai \(Tahap 1\)/i).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('Khotmil_15_Juz_Tahap_1');
    });

    test('Khotmil 30 Juz: membuka modal Excel dan mengunduh template dengan format kolom tabel yang sesuai', async ({
      page,
    }) => {
      await page.goto('/tahfidz/khotmil/30');
      await expect(
        page.getByRole('heading', { name: 'Tahfidz Khotmil 30 Juz', exact: true })
      ).toBeVisible({ timeout: 15000 });

      // Buka modal Menu Excel Khotmil
      const excelBtn = page.locator('button:has(svg.lucide-file-spreadsheet)').or(page.getByRole('button', { name: /Menu Excel/i }));
      await expect(excelBtn.first()).toBeVisible();
      await excelBtn.first().click();

      // Verifikasi modal terbuka
      await expect(page.getByRole('heading', { name: /Menu Excel Khotmil/i })).toBeVisible();

      // Verifikasi tombol Template Excel Nilai (Tahap 1) dan format kolom tabel
      await expect(page.getByText(/Template Excel Nilai \(Tahap 1\)/i)).toBeVisible();
      await expect(page.getByText(/Format kolom tabel: No, Nama Santri, Asrama, Halaqoh, Juz 1 - 5/i)).toBeVisible();

      // Uji unduh template dan periksa nama berkas
      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Template Excel Nilai \(Tahap 1\)/i).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('Khotmil_30_Juz_Tahap_1');
    });
  });

  test.describe('6. Modul Pengguna & Otoritas - Switch "Log Aktivitas" & Retensi 6 Bulan (/pengaturan?tab=pengguna)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('menampilkan switcher Daftar Pengguna vs Log Aktivitas dan badge retensi 6 bulan', async ({
      page,
    }) => {
      await page.goto('/pengaturan?tab=pengguna');

      // Tunggu hingga verifikasi hak akses selesai dan header pengaturan muncul
      await expect(
        page.getByRole('heading', { name: /Pengaturan Aplikasi/i })
      ).toBeVisible({ timeout: 30000 });

      // Verifikasi switch buttons tersedia
      const usersSwitchBtn = page.getByRole('button', { name: /Daftar Pengguna & Otoritas/i });
      const logsSwitchBtn = page.getByRole('button', { name: /Log Aktivitas/i });
      await expect(usersSwitchBtn).toBeVisible({ timeout: 15000 });
      await expect(logsSwitchBtn).toBeVisible();

      // Verifikasi badge retensi 6 bulan
      await expect(
        page.getByText(/Log aktivitas otomatis terhapus setiap 6 bulan sekali \(180 hari\)/i)
      ).toBeVisible();

      // Verifikasi tampilan default adalah daftar pengguna
      await expect(page.getByRole('button', { name: /Tambah Pengguna/i })).toBeVisible();

      // Klik switch ke "Log Aktivitas"
      await logsSwitchBtn.click();

      // Verifikasi elemen halaman Log Aktivitas tampil
      await expect(page.getByText(/Total Log Tersimpan/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Aktivitas Hari Ini/i)).toBeVisible();
      await expect(page.getByText(/Retensi Log Otomatis/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Ekspor ke Excel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Bersihkan > 6 Bln/i })).toBeVisible();

      // Verifikasi kolom tabel log aktivitas
      await expect(page.getByRole('columnheader', { name: 'Waktu' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Pengguna' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Kategori' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /Aksi & Deskripsi Aktivitas/i })).toBeVisible();

      // Klik switch kembali ke "Daftar Pengguna & Otoritas"
      await usersSwitchBtn.click();
      await expect(page.getByRole('button', { name: /Tambah Pengguna/i })).toBeVisible();
    });

    test('navigasi langsung via URL query sub=log membuka halaman Log Aktivitas secara instan', async ({
      page,
    }) => {
      await page.goto('/pengaturan?tab=pengguna&sub=log');

      // Tunggu hingga verifikasi hak akses selesai dan header pengaturan muncul
      await expect(
        page.getByRole('heading', { name: /Pengaturan Aplikasi/i })
      ).toBeVisible({ timeout: 30000 });

      // Verifikasi langsung mendarat di halaman Log Aktivitas
      await expect(page.getByText(/Total Log Tersimpan/i)).toBeVisible({ timeout: 15000 });

      // Tunggu hingga data log termuat dan tombol ekspor siap digunakan
      const exportBtn = page.getByRole('button', { name: /Ekspor ke Excel/i });
      await expect(exportBtn).toBeVisible({ timeout: 15000 });
      await expect(exportBtn).toBeEnabled({ timeout: 15000 });
      await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15000 });

      // Uji ekspor excel
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('Log_Aktivitas');
    });
  });

  test.describe('7. Pusat Panduan Kontekstual & Pencarian Cepat Dokumentasi', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('di halaman /santri: mengklik profil membuka modal panduan spesifik Data Santri Tahfidz dan melakukan pencarian live search', async ({ page }) => {
      await page.goto('/santri');
      await expect(page.getByRole('heading', { name: /Data Santri Tahfidz/i })).toBeVisible({ timeout: 15000 });

      // Verifikasi tombol profil di header atas memiliki label/tooltip panduan
      const profileGuideBtn = page.getByRole('button', { name: /Buka Panduan Halaman Ini & Pencarian Panduan/i });
      await expect(profileGuideBtn).toBeVisible();

      // Klik tombol profil untuk membuka modal panduan kontekstual
      await profileGuideBtn.click();

      // Verifikasi modal terbuka dengan judul utama
      const modalHeading = page.getByRole('heading', { name: /Pusat Panduan & Bantuan LPTQ/i });
      await expect(modalHeading).toBeVisible();

      // Verifikasi isi panduan otomatis sesuai dengan halaman aktif (/santri)
      await expect(page.getByText('📍 Panduan Halaman Ini')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Master Data Santri Tahfidz' })).toBeVisible();
      await expect(page.getByText(/BAB 3: Pengelolaan Data Santri Tahfidz/i)).toBeVisible();

      // Uji fitur pencarian khusus panduan: ketik "omr"
      const searchInput = page.getByPlaceholder(/Cari topik panduan/i);
      await searchInput.fill('omr');

      // Verifikasi hasil live search muncul menyaring topik OMR & Khotmil
      await expect(page.getByText(/Hasil Pencarian untuk.*omr/i)).toBeVisible();
      await expect(page.getByText(/BAB 6: Tahfidz Khotmil/i).first()).toBeVisible();

      // Bersihkan pencarian dan verifikasi kembali ke panduan kontekstual halaman
      await searchInput.fill('');
      await expect(page.getByRole('heading', { name: 'Master Data Santri Tahfidz' })).toBeVisible();

      // Tutup modal menggunakan tombol Tutup
      await page.getByRole('button', { name: /Tutup/i }).last().click();
      await expect(modalHeading).not.toBeVisible();
    });

    test('di halaman /alat/flyer-khataman: panduan otomatis berubah menyesuaikan modul Flyer Khataman', async ({ page }) => {
      await page.goto('/alat/flyer-khataman');
      await expect(page.getByRole('heading', { name: /Flyer Khataman Al-Qur'an/i })).toBeVisible({ timeout: 15000 });

      // Buka modal panduan dari header
      const profileGuideBtn = page.getByRole('button', { name: /Buka Panduan Halaman Ini & Pencarian Panduan/i });
      await expect(profileGuideBtn).toBeVisible();
      await profileGuideBtn.click();

      // Verifikasi panduan otomatis menyajikan konten spesifik Flyer Khataman & BAB 7
      await expect(page.getByRole('heading', { name: 'Generator Flyer Khataman 30 Juz & Kirim WA' })).toBeVisible();
      await expect(page.getByText(/BAB 7: Alat Lanjutan.*Flyer Khataman/i)).toBeVisible();

      // Tutup modal menggunakan tombol keyboard Escape
      await page.keyboard.press('Escape');
      await expect(page.getByRole('heading', { name: /Pusat Panduan & Bantuan LPTQ/i })).not.toBeVisible();
    });
  });

  test.describe('8. Cetak Lembar LJK Khotmil 15 Juz & 30 Juz (Optimasi 2 LJK per Halaman A4)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('di halaman /tahfidz/khotmil/15: modal cetak LJK menampilkan panduan 2 LJK per lembar A4 dan container cetak tersusun rapi', async ({ page }) => {
      await page.goto('/tahfidz/khotmil/15');
      await expect(page.getByRole('heading', { level: 1, name: /Tahfidz Khotmil 15 Juz/i })).toBeVisible({ timeout: 15000 });

      // Verifikasi tombol "Cetak LJK" ada dan dapat diklik
      const cetakLjkBtn = page.getByRole('button', { name: /Cetak Lembar LJK/i });
      await expect(cetakLjkBtn).toBeVisible({ timeout: 15000 });
      await cetakLjkBtn.click();

      // Modal Cetak LJK terbuka
      const modalHeading = page.getByRole('heading', { name: /Cetak Lembar LJK Standar OMR/i });
      await expect(modalHeading).toBeVisible();

      // Verifikasi panduan efisiensi kertas A4 (2 LJK per lembar A4)
      await expect(page.getByText(/1 lembar kertas A4 memuat tepat 2 lembar LJK/i)).toBeVisible();

      // Verifikasi tombol cetak menampilkan hitungan lembar A4 yang dihemat
      const printBtn = page.getByRole('button', { name: /Cetak .* LJK .* Lembar A4/i });
      await expect(printBtn).toBeVisible();

      // Verifikasi struktur DOM lembar cetak (print-ljk-container)
      const a4Sheets = page.locator('.print-ljk-container .a4-page-sheet');
      const sheetCount = await a4Sheets.count();
      if (sheetCount > 0) {
        // Pada halaman A4 pertama, pastikan terdapat garis potong gunting (cut-line)
        const cutLine = a4Sheets.first().locator('.cut-line');
        await expect(cutLine).toBeAttached();
        await expect(cutLine).toContainText('POTONG / GUNTING DI SINI');

        // Pastikan di dalam sheet terdapat elemen LJK dengan penanda sudut (fiducials)
        const cornerMarker = a4Sheets.first().locator('[title="Corner Top-Left"]').first();
        await expect(cornerMarker).toBeAttached();
      }

      // Tutup modal
      await page.getByRole('button', { name: /Tutup/i }).click();
      await expect(modalHeading).not.toBeVisible();
    });

    test('di halaman /tahfidz/khotmil/30: modal cetak LJK berfungsi valid dengan layout 2 LJK per lembar A4', async ({ page }) => {
      await page.goto('/tahfidz/khotmil/30');
      await expect(page.getByRole('heading', { level: 1, name: /Tahfidz Khotmil 30 Juz/i })).toBeVisible({ timeout: 15000 });

      // Buka modal Cetak LJK
      const cetakLjkBtn = page.getByRole('button', { name: /Cetak Lembar LJK/i });
      await expect(cetakLjkBtn).toBeVisible({ timeout: 15000 });
      await cetakLjkBtn.click();

      // Modal Cetak LJK terbuka
      const modalHeading = page.getByRole('heading', { name: /Cetak Lembar LJK Standar OMR/i });
      await expect(modalHeading).toBeVisible();

      // Verifikasi teks optimasi A4
      await expect(page.getByText(/Hemat 50% kertas/i)).toBeVisible();

      // Verifikasi tombol cetak siap dengan kalkulasi lembar A4
      const printBtn = page.getByRole('button', { name: /Cetak .* LJK .* Lembar A4/i });
      await expect(printBtn).toBeVisible();

      // Tutup modal
      await page.getByRole('button', { name: /Tutup/i }).click();
      await expect(modalHeading).not.toBeVisible();
    });
  });
});
