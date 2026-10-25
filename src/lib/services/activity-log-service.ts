import type { UserActivityLog, LogKategori, AppRole } from "@/types/database";

export const ACTIVITY_LOGS_SETTING_KEY = "USER_ACTIVITY_LOGS";
export const RETENTION_DAYS = 180; // 6 Bulan (180 hari)
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface ActivityLogInput {
  user_id: string;
  nama: string;
  username: string;
  role: AppRole | string;
  action?: string;
  aksi?: string;
  kategori: LogKategori | string;
  deskripsi: string;
  modul?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

/**
 * Memfilter log yang telah berusia lebih dari 6 bulan (180 hari)
 */
export function filterExpiredLogs(logs: UserActivityLog[]): {
  validLogs: UserActivityLog[];
  expiredCount: number;
} {
  const cutoff = Date.now() - RETENTION_MS;
  const validLogs: UserActivityLog[] = [];
  let expiredCount = 0;

  logs.forEach((log) => {
    const logTime = new Date(log.created_at).getTime();
    if (!Number.isNaN(logTime) && logTime >= cutoff) {
      validLogs.push(log);
    } else {
      expiredCount++;
    }
  });

  return { validLogs, expiredCount };
}

/**
 * Contoh data riwayat aktivitas realistis awal (dalam rentang 6 bulan terakhir)
 */
export function generateInitialSeedLogs(): UserActivityLog[] {
  const now = Date.now();
  const m = (minutesAgo: number) => new Date(now - minutesAgo * 60 * 1000).toISOString();
  const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000).toISOString();
  const d = (daysAgo: number) => new Date(now - daysAgo * 86400 * 1000).toISOString();

  return [
    {
      id: "log_init_01",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "LOGIN",
      kategori: "Autentikasi",
      deskripsi: "Admin Pusat LPTQ (@admin) berhasil masuk ke sistem melalui peramban Desktop Chrome.",
      ip_address: "127.0.0.1",
      created_at: m(14),
    },
    {
      id: "log_init_02",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "UPDATE_TEMPLATE_IMPORT",
      kategori: "Penilaian Tahfidz",
      deskripsi: "Memperbarui format template import Excel Khotmil 15 & 30 Juz sesuai urutan kolom tabel.",
      ip_address: "127.0.0.1",
      created_at: h(1),
    },
    {
      id: "log_init_03",
      user_id: "40be31ee-6a62-4742-96b9-25c03f3e9851",
      nama: "Ust. Pembimbing 1A",
      username: "pembimbing1a",
      role: "pembimbing",
      action: "INPUT_NILAI",
      kategori: "Penilaian Tahfidz",
      deskripsi: "Memperbarui nilai Juz 1 santri Ashfina Bimaziyyati Akmala (Skor: 90) pada Khotmil 15 Juz Tahap 1.",
      ip_address: "192.168.1.15",
      created_at: h(3),
    },
    {
      id: "log_init_04",
      user_id: "a9842861-374b-42b1-aa55-a0113968d4a4",
      nama: "LPTQ Staff",
      username: "lptq",
      role: "viewer",
      action: "EXPORT_DATA",
      kategori: "Penilaian Tahfidz",
      deskripsi: "Mengekspor rekap tabel nilai Khotmil 15 Juz Tahap 1 ke berkas Excel (.xlsx).",
      ip_address: "192.168.1.20",
      created_at: h(6),
    },
    {
      id: "log_init_05",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "CONNECT_WA",
      kategori: "Pengaturan Sistem",
      deskripsi: "Menghubungkan WhatsApp Gateway (Baileys Engine Port 3008) dengan nomor +6281958426856.",
      ip_address: "127.0.0.1",
      created_at: d(1),
    },
    {
      id: "log_init_06",
      user_id: "922c89d9-0dfa-4966-81a6-95ab3568493b",
      nama: "Sistem Madin",
      username: "sistemmadin",
      role: "viewer",
      action: "LOGIN",
      kategori: "Autentikasi",
      deskripsi: "Pengguna Sistem Madin (@sistemmadin) berhasil masuk ke sistem.",
      ip_address: "192.168.1.8",
      created_at: d(2),
    },
    {
      id: "log_init_07",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "UPDATE_PERMISSIONS",
      kategori: "Manajemen Pengguna",
      deskripsi: "Memperbarui konfigurasi hak akses modul untuk peran Pembimbing Halaqoh.",
      ip_address: "127.0.0.1",
      created_at: d(4),
    },
    {
      id: "log_init_08",
      user_id: "40be31ee-6a62-4742-96b9-25c03f3e9851",
      nama: "Ust. Pembimbing 1A",
      username: "pembimbing1a",
      role: "pembimbing",
      action: "INPUT_ABSENSI",
      kategori: "Data Santri",
      deskripsi: "Mencatat presensi tahfidz harian sesi pagi untuk 15 santri di Halaqoh 1A.",
      ip_address: "192.168.1.15",
      created_at: d(7),
    },
    {
      id: "log_init_09",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "UPDATE_BRANDING",
      kategori: "Pengaturan Sistem",
      deskripsi: "Memperbarui pengaturan visual dan identitas logo LPTQ Pondok Pesantren Darussalam Blokagung.",
      ip_address: "127.0.0.1",
      created_at: d(15),
    },
    {
      id: "log_init_10",
      user_id: "30542baa-2196-466b-946f-081467893058",
      nama: "Admin Pusat LPTQ",
      username: "admin",
      role: "admin",
      action: "CREATE_USER",
      kategori: "Manajemen Pengguna",
      deskripsi: "Membuat akun pengguna baru: Ust. Pembimbing 1A (@pembimbing1a) dengan peran PEMBIMBING.",
      ip_address: "127.0.0.1",
      created_at: d(30),
    },
  ];
}

/**
 * Mengambil daftar log aktivitas terkini dari Supabase app_settings.
 * Otomatis memvalidasi dan memusnahkan log yang lebih tua dari 6 bulan (180 hari).
 */
export async function fetchActivityLogsClient(): Promise<{
  logs: UserActivityLog[];
  cleanedExpiredCount: number;
}> {
  try {
    const res = await fetch("/api/admin/logs", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("Gagal mengambil log aktivitas dari server.");
    }
    const data = await res.json();
    return {
      logs: data.logs || [],
      cleanedExpiredCount: data.cleanedExpiredCount || 0,
    };
  } catch (err) {
    console.error("fetchActivityLogsClient error:", err);
    return { logs: [], cleanedExpiredCount: 0 };
  }
}
