import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAsAdmin } from "./helpers/auth";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yiwqgdqizdzsgikjlwoq.supabase.co";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd3FnZHFpemR6c2dpa2psd29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQxMDgyMSwiZXhwIjoyMTA3OTg2ODIxfQ.aF_tNdSjyF-Dg92HXYblZ9PmO2U0qtWgBmRTYkJnvpA";

test.describe("Menu Database Angkatan (15 Juz & 30 Juz)", () => {
  test.use({ navigationTimeout: 30_000 });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("grup menu Database Angkatan berada di paling bawah sidebar dengan Angkatan 15 Juz & 30 Juz", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Sidebar desktop diverifikasi terpisah dari drawer mobile.");
    await page.goto("/");

    const aside = page.locator("aside");
    await expect(aside).toBeVisible({ timeout: 15_000 });

    const pinBtn = aside.getByRole("button", { name: /Sematkan sidebar agar tetap terbuka/i });
    if (await pinBtn.isVisible().catch(() => false)) {
      await pinBtn.click();
    }

    const nav = aside.locator("nav");
    await expect(nav).toBeVisible({ timeout: 15_000 });

    const groupLabels = await nav
      .locator("p")
      .filter({ hasText: /UTAMA|TAHFIDZ|ALAT LANJUTAN|SISTEM|DATABASE ANGKATAN/i })
      .allTextContents();
    expect(groupLabels.length).toBeGreaterThan(0);
    expect(groupLabels[groupLabels.length - 1]?.toUpperCase()).toContain("DATABASE ANGKATAN");

    const link15 = nav.getByRole("link", { name: "Angkatan 15 Juz" });
    const link30 = nav.getByRole("link", { name: "Angkatan 30 Juz" });
    await expect(link15).toBeVisible();
    await expect(link30).toBeVisible();

    await link15.click();
    await expect(page).toHaveURL(/\/database-angkatan\/15/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Database Angkatan — Khotmil 15 Juz/i })
    ).toBeVisible({ timeout: 15_000 });

    await link30.scrollIntoViewIfNeeded();
    await link30.click();
    await expect(page).toHaveURL(/\/database-angkatan\/30/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Database Angkatan — Khotmil 30 Juz/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("CRUD angkatan tahun kustom, modal Tarik Lulusan, dan Tambah Manual di Angkatan 15 Juz", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Pengujian roundtrip mutasi database dijalankan pada desktop chromium.");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const initialName = `__PW_TEST_2025_${Date.now()}__`;
    const editedName = `${initialName}_REV`;

    try {
      await page.goto("/database-angkatan/15");
      await expect(
        page.getByRole("heading", { name: /Database Angkatan — Khotmil 15 Juz/i })
      ).toBeVisible({ timeout: 15_000 });

      // 1. Buat Angkatan Baru
      await page.getByRole("button", { name: /Buat Angkatan/i }).first().click();
      const createDialog = page.getByRole("dialog");
      await expect(createDialog).toBeVisible();
      await createDialog.getByPlaceholder(/Contoh: 2025/i).fill(initialName);
      await createDialog.getByRole("button", { name: /^Buat Angkatan$/i }).click();
      await expect(createDialog).not.toBeVisible({ timeout: 15_000 });

      await expect(page.getByRole("button", { name: new RegExp(initialName) })).toBeVisible({
        timeout: 15_000,
      });

      // 2. Rename / Edit Angkatan
      await page.getByRole("button", { name: /Ubah Nama \/ Info/i }).click();
      const editDialog = page.getByRole("dialog");
      await expect(editDialog).toBeVisible();
      await editDialog.getByPlaceholder(/Contoh: 2025/i).fill(editedName);
      await editDialog.getByRole("button", { name: /Simpan Perubahan/i }).click();
      await expect(editDialog).not.toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("button", { name: new RegExp(editedName) })).toBeVisible({
        timeout: 15_000,
      });

      // 3. Verifikasi Modal Tarik Lulusan Khotmil terbuka & menampilkan filter Tahap 5
      await page.getByRole("button", { name: /Tarik Lulusan Khotmil/i }).click();
      const pullDialog = page.getByRole("dialog");
      await expect(pullDialog).toBeVisible();
      await expect(pullDialog.getByText(/Lulus Penuh/i).first()).toBeVisible();
      await expect(
        pullDialog.getByText(/Keluarkan santri terpilih dari tabel Khotmil aktif/i)
      ).toBeVisible();
      await pullDialog.getByRole("button", { name: "Batal" }).click();
      await expect(pullDialog).not.toBeVisible();

      // 4. Tambah Manual (Input Alumni Bebas)
      await page.getByRole("button", { name: /Tambah Manual/i }).click();
      const manualDialog = page.getByRole("dialog");
      await expect(manualDialog).toBeVisible();
      await manualDialog.getByRole("button", { name: /Input Alumni Bebas/i }).click();
      await manualDialog.getByPlaceholder(/Nama lengkap alumni/i).fill("Ahmad Alumni Uji E2E");
      await manualDialog.getByPlaceholder(/Contoh: 5A/i).fill("5A");
      await manualDialog.getByPlaceholder(/0 - 100/i).fill("92.5");
      await manualDialog.getByRole("button", { name: /Simpan ke Arsip/i }).click();
      await expect(manualDialog).not.toBeVisible({ timeout: 15_000 });

      // Verifikasi baris muncul di tabel
      await expect(page.getByText("Ahmad Alumni Uji E2E")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("cell", { name: "92.50" })).toBeVisible();

      // Verifikasi Detail Nilai modal
      await page.getByRole("button", { name: /Detail/i }).first().click();
      const detailDialog = page.getByRole("dialog");
      await expect(detailDialog).toBeVisible();
      await expect(detailDialog.getByText(/Arsip Nilai — Ahmad Alumni Uji E2E/i)).toBeVisible();
      await detailDialog.getByRole("button", { name: "Tutup" }).last().click();
      await expect(detailDialog).not.toBeVisible();

      // 5. Hapus Angkatan test lewat UI
      await page.getByRole("button", { name: /Hapus Angkatan/i }).click();
      const delDialog = page.getByRole("dialog");
      await expect(delDialog).toBeVisible();
      await delDialog.getByRole("button", { name: /Ya, Hapus Angkatan/i }).click();
      await expect(delDialog).not.toBeVisible({ timeout: 15_000 });

      await expect(
        page.getByRole("button", { name: new RegExp(editedName) })
      ).not.toBeVisible({ timeout: 15_000 });
    } finally {
      await admin
        .from("khotmil_angkatan")
        .delete()
        .in("nama_angkatan", [initialName, editedName]);
    }
  });
});
