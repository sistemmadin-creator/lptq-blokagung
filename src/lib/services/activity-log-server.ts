import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import type { UserActivityLog, LogKategori } from "@/types/database";
import {
  ACTIVITY_LOGS_SETTING_KEY,
  filterExpiredLogs,
  generateInitialSeedLogs,
  type ActivityLogInput,
} from "./activity-log-service";

export { ACTIVITY_LOGS_SETTING_KEY, RETENTION_DAYS } from "./activity-log-service";
export type { ActivityLogInput };

/**
 * Fungsi Server-side untuk membaca log, menyaring retensi 6 bulan, dan menyimpan perubahan jika ada log yang kadaluwarsa.
 */
export async function getAndPruneServerActivityLogs(
  supabaseServer: ReturnType<typeof createServerSupabase>
): Promise<{ logs: UserActivityLog[]; cleanedExpiredCount: number }> {
  try {
    const { data: row } = await supabaseServer
      .from("app_settings")
      .select("value")
      .eq("key", ACTIVITY_LOGS_SETTING_KEY)
      .maybeSingle();

    let existingLogs: UserActivityLog[] = [];
    if (Array.isArray(row?.value) && row.value.length > 0) {
      existingLogs = row.value as UserActivityLog[];
    } else {
      existingLogs = generateInitialSeedLogs();
      // Simpan seed awal
      await supabaseServer.from("app_settings").upsert({
        key: ACTIVITY_LOGS_SETTING_KEY,
        value: existingLogs,
        updated_at: new Date().toISOString(),
      });
    }

    // Pembersihan otomatis 6 bulan (180 hari)
    const { validLogs, expiredCount } = filterExpiredLogs(existingLogs);

    if (expiredCount > 0) {
      // Simpan hasil pembersihan kembali ke database
      await supabaseServer.from("app_settings").upsert({
        key: ACTIVITY_LOGS_SETTING_KEY,
        value: validLogs,
        updated_at: new Date().toISOString(),
      });
    }

    // Urutkan dari yang terbaru ke terlama
    validLogs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { logs: validLogs, cleanedExpiredCount: expiredCount };
  } catch (err) {
    console.error("getAndPruneServerActivityLogs error:", err);
    return { logs: generateInitialSeedLogs(), cleanedExpiredCount: 0 };
  }
}

/**
 * Menambahkan entri log aktivitas baru dan membersihkan log yang telah melewati 6 bulan.
 * Mendukung pemanggilan dengan (supabaseClient, entry) atau cukup (entry).
 */
export async function recordServerActivityLog(
  clientOrEntry: any,
  maybeEntry?: ActivityLogInput
): Promise<UserActivityLog> {
  let supabaseServer: any;
  let entry: ActivityLogInput;

  if (maybeEntry && typeof clientOrEntry?.from === "function") {
    supabaseServer = clientOrEntry;
    entry = maybeEntry;
  } else {
    try {
      supabaseServer = createServiceRoleClient();
    } catch {
      supabaseServer = createServerSupabase();
    }
    entry = clientOrEntry as ActivityLogInput;
  }

  // Normalisasi Kategori
  let kategoriNorm: LogKategori = "Lainnya";
  const rawKat = (entry.kategori || "").toLowerCase();
  if (rawKat.includes("auth") || rawKat.includes("login")) {
    kategoriNorm = "Autentikasi";
  } else if (rawKat.includes("santri")) {
    kategoriNorm = "Data Santri";
  } else if (
    rawKat.includes("tahfidz") ||
    rawKat.includes("nilai") ||
    rawKat.includes("import") ||
    rawKat.includes("khotmil")
  ) {
    kategoriNorm = "Penilaian Tahfidz";
  } else if (rawKat.includes("wa") || rawKat.includes("gateway")) {
    kategoriNorm = "WhatsApp Gateway";
  } else if (rawKat.includes("user") || rawKat.includes("pengguna")) {
    kategoriNorm = "Manajemen Pengguna";
  } else if (rawKat.includes("backup")) {
    kategoriNorm = "Backup & Restore";
  } else if (rawKat.includes("ekspor") || rawKat.includes("export") || rawKat.includes("cetak")) {
    kategoriNorm = "Ekspor & Cetak";
  } else if (rawKat.includes("atur") || rawKat.includes("setting") || rawKat.includes("sistem")) {
    kategoriNorm = "Pengaturan Sistem";
  } else if (
    [
      "Autentikasi",
      "Data Santri",
      "Penilaian Tahfidz",
      "WhatsApp Gateway",
      "Pengaturan Sistem",
      "Manajemen Pengguna",
      "Backup & Restore",
      "Ekspor & Cetak",
      "Lainnya",
    ].includes(entry.kategori as any)
  ) {
    kategoriNorm = entry.kategori as LogKategori;
  }

  const actionName = entry.action || entry.aksi || "AKTIVITAS";

  const newLog: UserActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: entry.user_id,
    nama: entry.nama,
    username: (entry.username || "user").replace(/^@/, ""),
    role: entry.role,
    action: actionName,
    kategori: kategoriNorm,
    deskripsi: entry.deskripsi,
    ip_address: entry.ip_address || "-",
    user_agent: entry.user_agent,
    created_at: entry.created_at || new Date().toISOString(),
  };

  try {
    const { data: row } = await supabaseServer
      .from("app_settings")
      .select("value")
      .eq("key", ACTIVITY_LOGS_SETTING_KEY)
      .maybeSingle();

    let list: UserActivityLog[] = [];
    if (Array.isArray(row?.value)) {
      list = row.value as UserActivityLog[];
    } else {
      list = generateInitialSeedLogs();
    }

    // Saring log lama (> 6 bulan)
    const { validLogs } = filterExpiredLogs(list);

    // Tambahkan log baru di posisi paling atas
    validLogs.unshift(newLog);

    await supabaseServer.from("app_settings").upsert({
      key: ACTIVITY_LOGS_SETTING_KEY,
      value: validLogs,
      updated_at: new Date().toISOString(),
    });

    return newLog;
  } catch (err) {
    console.error("recordServerActivityLog error:", err);
    return newLog;
  }
}
