import { test, expect } from '@playwright/test';

test.describe('Autentikasi & Proteksi Rute (Auth & Route Protection)', () => {
  test('pengguna tanpa sesi dialihkan otomatis ke halaman /login saat mengakses rute terproteksi', async ({ page }) => {
    // Kunjungi rute terproteksi tanpa cookies autentikasi
    await page.goto('/santri');

    // Middleware Next.js harus mengalihkan ke /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeVisible();
  });

  test('halaman login menampilkan seluruh elemen form secara lengkap dan dapat diakses', async ({ page }) => {
    await page.goto('/login');

    // Cek judul dokumen memuat nama aplikasi
    await expect(page).toHaveTitle(/LPTQ Blokagung/i);

    // Cek input form dan tombol via semantic roles
    const usernameInput = page.getByRole('textbox', { name: 'Nama Pengguna' });
    const passwordInput = page.locator('#password');
    const submitButton = page.getByRole('button', { name: 'Masuk', exact: true });
    const togglePasswordBtn = page.getByRole('button', { name: 'Tampilkan kata sandi' });

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(togglePasswordBtn).toBeVisible();
  });

  test('validasi form: menampilkan pesan kesalahan jika form dikirim dalam keadaan kosong', async ({ page }) => {
    await page.goto('/login');

    const usernameInput = page.getByRole('textbox', { name: 'Nama Pengguna' });
    const passwordInput = page.locator('#password');
    const submitButton = page.getByRole('button', { name: 'Masuk', exact: true });

    // Hapus atribut required sementara pada DOM agar pengujian validasi custom handler terpicu
    await usernameInput.evaluate((el: HTMLInputElement) => el.removeAttribute('required'));
    await passwordInput.evaluate((el: HTMLInputElement) => el.removeAttribute('required'));

    // Submit form yang kosong
    await submitButton.click();

    // Verifikasi pesan kesalahan muncul pada antarmuka pengguna
    await expect(page.getByText(/Nama Pengguna dan Kata Sandi wajib diisi/i)).toBeVisible();
  });

  test('fitur intip sandi: tombol toggle mengubah tipe input antara password dan text', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Klik tombol tampilkan kata sandi
    const toggleBtn = page.getByRole('button', { name: 'Tampilkan kata sandi' });
    await toggleBtn.click();

    // Setelah diklik, tipe input berubah menjadi text
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Klik tombol sembunyikan kata sandi
    const hideBtn = page.getByRole('button', { name: 'Sembunyikan kata sandi' });
    await hideBtn.click();

    // Kembali menjadi password
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('percobaan masuk dengan kredensial yang salah menampilkan pesan penolakan yang tepat', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('textbox', { name: 'Nama Pengguna' }).fill('pengguna_uji_tidak_ada');
    await page.locator('#password').fill('PasswordSalah123!');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();

    // Verifikasi pesan kesalahan autentikasi muncul pada antarmuka
    await expect(page.getByText(/Nama pengguna atau kata sandi tidak valid/i).first()).toBeVisible();
  });
});
