import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Evaluasi Hafalan (Pengurus Pusat) — Snapshot Bilangan Bulat 1-30', () => {
  test.beforeEach(async ({ page }) => {
    // Safeguard: never mutate live Supabase setoran records during E2E tests
    await page.route('**/rest/v1/setoran*', async (route) => {
      const method = route.request().method();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginAsAdmin(page);
    await page.goto('/tahfidz/umum/evaluasi');
    await expect(
      page.getByRole('heading', { name: /Evaluasi Hafalan \(Pengurus Pusat\)/i })
    ).toBeVisible({ timeout: 20000 });
  });

  test('menampilkan label Capaian, atribut input bilangan bulat 1-30, dan memblokir tanda koma/titik', async ({
    page,
  }) => {
    // Mode default Kartu menampilkan label "Capaian" (bukan akumulasi desimal)
    await expect(page.getByText('Capaian').first()).toBeVisible({ timeout: 15000 });

    // Beralih ke mode Tabel
    await page.getByRole('button', { name: 'Tabel' }).click();

    await expect(page.getByRole('columnheader', { name: 'CAPAIAN' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'STATUS TARGET' })).toBeVisible();

    // Ambil input bulan pertama dengan atribut integer 1-30
    const firstMonthInput = page
      .locator('tbody tr input[type="number"][step="1"][max="30"]')
      .first();
    await expect(firstMonthInput).toBeVisible({ timeout: 15000 });
    await expect(firstMonthInput).toHaveAttribute('min', '0');
    await expect(firstMonthInput).toHaveAttribute('max', '30');
    await expect(firstMonthInput).toHaveAttribute('step', '1');

    // Simulasikan pengetikan desimal ("2.5" dan "2,5") -> karakter non-digit harus diblokir
    await firstMonthInput.click();
    await firstMonthInput.fill('');
    await firstMonthInput.pressSequentially('2.5');
    await expect(firstMonthInput).toHaveValue('25');

    await firstMonthInput.fill('');
    await firstMonthInput.pressSequentially('2,5');
    await expect(firstMonthInput).toHaveValue('25');

    // Reset input tanpa menyimpan perubahan
    await firstMonthInput.fill('');
  });

  test('menolak otomatis input lebih kecil dari bulan sebelumnya maupun di atas 30', async ({
    page,
  }) => {
    let writeRequestsCount = 0;
    await page.route('**/rest/v1/setoran*', async (route) => {
      const method = route.request().method();
      if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        await route.continue();
        return;
      }
      writeRequestsCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.getByRole('button', { name: 'Tabel' }).click();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    // Cari baris yang sudah punya bulan terisi >= 2 dengan bulan berikutnya masih kosong,
    // atau gunakan baris pertama dengan mengisi bulan Jan = 5 lalu uji Feb = 3
    const rowCount = await rows.count();
    let prevIndex = -1;
    let targetRowIndex = 0;

    for (let r = 0; r < Math.min(rowCount, 15); r++) {
      const inputs = rows.nth(r).locator('input[type="number"][step="1"][max="30"]');
      const inputCount = await inputs.count();
      if (inputCount < 12) continue;

      for (let m = 0; m < 11; m++) {
        const valCurr = await inputs.nth(m).inputValue();
        const valNext = await inputs.nth(m + 1).inputValue();
        if (valCurr !== '' && Number(valCurr) >= 2 && valNext === '') {
          targetRowIndex = r;
          prevIndex = m;
          break;
        }
      }
      if (prevIndex !== -1) break;
    }

    const rowInputs = rows
      .nth(targetRowIndex)
      .locator('input[type="number"][step="1"][max="30"]');

    if (prevIndex === -1) {
      // Baris belum punya riwayat terisi: isi Jan = 5 terlebih dahulu (mock write)
      await rowInputs.nth(0).fill('5');
      await rowInputs.nth(0).press('Enter');
      await expect(rowInputs.nth(0)).toHaveValue('5');
      prevIndex = 0;
      writeRequestsCount = 0;
    }

    const prevVal = Number(await rowInputs.nth(prevIndex).inputValue());
    const rejectedSmaller = String(Math.max(1, prevVal - 1));
    const nextInput = rowInputs.nth(prevIndex + 1);

    // Masukkan nilai lebih kecil dari bulan sebelumnya -> wajib ditolak otomatis & dikembalikan
    await nextInput.fill(rejectedSmaller);
    await nextInput.blur();

    await expect(nextInput).toHaveValue('');
    expect(writeRequestsCount).toBe(0);

    // Masukkan nilai > 30 (misal 31) -> wajib ditolak otomatis
    await nextInput.fill('31');
    await nextInput.blur();

    await expect(nextInput).toHaveValue('');
    expect(writeRequestsCount).toBe(0);
  });

  test('modal input (+) memakai label Kondisi Juz Saat Ini (1 - 30) dan step=1', async ({
    page,
  }) => {
    const addButton = page.locator('button[aria-label="Input Log Setoran"]');
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();

    await expect(page.getByText('Kondisi Juz Saat Ini (1 - 30)')).toBeVisible();

    const modalJuzInput = page.locator('input[type="number"][step="1"][max="30"]').last();
    await expect(modalJuzInput).toBeVisible();
    await expect(modalJuzInput).toHaveAttribute('min', '1');
    await expect(modalJuzInput).toHaveAttribute('max', '30');

    await page.keyboard.press('Escape');
  });

  test('status target mengikuti batas atas halaqoh_kelas * 3 (misal Kelas 2 target 6 Juz)', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Tabel' }).click();

    // Cari santri Kelas 2 (halaqoh "2A", target maksimal = 2 * 3 = 6 Juz)
    const searchBox = page.getByRole('textbox', { name: 'Cari santri' });
    await expect(searchBox).toBeVisible({ timeout: 15000 });
    await searchBox.fill('Dina Silvana');

    const kelas2Row = page
      .locator('tbody tr')
      .filter({ hasText: 'Dina Silvana' })
      .first();
    await expect(kelas2Row).toBeVisible({ timeout: 15000 });
    await expect(kelas2Row.locator('td').nth(4)).toHaveText('2A');

    const janInput = kelas2Row
      .locator('input[type="number"][step="1"][max="30"]')
      .first();

    // Isi 5 Juz di Kelas 2 -> belum mencapai target kelas 2 (6 Juz), harus tetap "Berjalan"
    await janInput.fill('5');
    await janInput.press('Enter');
    await expect(kelas2Row.getByText('5 Juz')).toBeVisible();
    await expect(kelas2Row.getByText('Berjalan')).toBeVisible();
    await expect(kelas2Row.getByText('Selesai')).toHaveCount(0);

    // Naikkan ke 6 Juz -> mencapai target kelas 2 (6 Juz), status harus menjadi "Selesai"
    await janInput.fill('6');
    await janInput.press('Enter');
    await expect(kelas2Row.getByText('6 Juz')).toBeVisible();
    await expect(kelas2Row.getByText('Selesai')).toBeVisible();
  });
});
