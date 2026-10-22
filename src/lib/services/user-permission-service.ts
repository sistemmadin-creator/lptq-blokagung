import { createClient } from "@/lib/supabase/client";
import type { AppRole, ModuleKey, PermissionLevel, UserAccountItem, UserPermissions } from "@/types/database";

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  group: "Utama" | "Tahfidz Umum" | "Tahfidz Khotmil" | "Alat Lanjutan" | "Sistem";
  path: string;
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Ringkasan statistik tahfidz, santri, dan aktivitas umum.",
    group: "Utama",
    path: "/",
  },
  {
    key: "santri",
    label: "Data Santri Tahfidz",
    description: "Database santri, nomor kontak, asrama, blok, dan kamar.",
    group: "Utama",
    path: "/santri",
  },
  {
    key: "halaqoh",
    label: "Halaqoh",
    description: "Distribusi kelas, kelompok halaqoh santri, dan pembimbing.",
    group: "Utama",
    path: "/halaqoh",
  },
  {
    key: "kegiatan",
    label: "Kegiatan (Absensi)",
    description: "Pencatatan presensi tahfidz pagi dan malam.",
    group: "Tahfidz Umum",
    path: "/tahfidz/umum/kegiatan",
  },
  {
    key: "juz_baru",
    label: "Juz Baru (Pembimbing)",
    description: "Pencatatan setoran hafalan juz baru santri.",
    group: "Tahfidz Umum",
    path: "/tahfidz/umum/juz-baru",
  },
  {
    key: "evaluasi",
    label: "Evaluasi (Pengurus)",
    description: "Evaluasi dan ujian kelayakan hafalan santri.",
    group: "Tahfidz Umum",
    path: "/tahfidz/umum/evaluasi",
  },
  {
    key: "khotmil_15",
    label: "Khotmil 15 Juz",
    description: "Ujian khataman 15 Juz (5 tahap) & rekap kelulusan.",
    group: "Tahfidz Khotmil",
    path: "/tahfidz/khotmil/15",
  },
  {
    key: "khotmil_30",
    label: "Khotmil 30 Juz",
    description: "Ujian khataman 30 Juz (9 tahap) & rekap kelulusan.",
    group: "Tahfidz Khotmil",
    path: "/tahfidz/khotmil/30",
  },
  {
    key: "flyer",
    label: "Flyer Khataman",
    description: "Pembuatan otomatis flyer kelulusan khataman santri.",
    group: "Alat Lanjutan",
    path: "/alat/flyer-khataman",
  },
  {
    key: "wa",
    label: "Kirim WhatsApp",
    description: "Broadcast pesan dan pengingat via WhatsApp.",
    group: "Alat Lanjutan",
    path: "/alat/kirim-wa",
  },
  {
    key: "user_management",
    label: "Pengaturan",
    description: "Pusat pengaturan sistem, logo, background, standar KKM, dan hak akses.",
    group: "Sistem",
    path: "/pengaturan",
  },
];

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<AppRole, UserPermissions> = {
  admin: {
    dashboard: "edit",
    santri: "edit",
    halaqoh: "edit",
    kegiatan: "edit",
    juz_baru: "edit",
    evaluasi: "edit",
    khotmil_15: "edit",
    khotmil_30: "edit",
    flyer: "edit",
    wa: "edit",
    user_management: "edit",
  },
  pengurus: {
    dashboard: "edit",
    santri: "edit",
    halaqoh: "edit",
    kegiatan: "edit",
    juz_baru: "edit",
    evaluasi: "edit",
    khotmil_15: "edit",
    khotmil_30: "edit",
    flyer: "edit",
    wa: "edit",
    user_management: "sembunyikan",
  },
  pembimbing: {
    dashboard: "baca",
    santri: "baca",
    halaqoh: "baca",
    kegiatan: "edit",
    juz_baru: "edit",
    evaluasi: "baca",
    khotmil_15: "sembunyikan",
    khotmil_30: "sembunyikan",
    flyer: "baca",
    wa: "sembunyikan",
    user_management: "sembunyikan",
  },
  operator_absen: {
    dashboard: "baca",
    santri: "baca",
    halaqoh: "baca",
    kegiatan: "edit",
    juz_baru: "sembunyikan",
    evaluasi: "sembunyikan",
    khotmil_15: "sembunyikan",
    khotmil_30: "sembunyikan",
    flyer: "sembunyikan",
    wa: "sembunyikan",
    user_management: "sembunyikan",
  },
  viewer: {
    dashboard: "baca",
    santri: "baca",
    halaqoh: "baca",
    kegiatan: "baca",
    juz_baru: "baca",
    evaluasi: "baca",
    khotmil_15: "baca",
    khotmil_30: "baca",
    flyer: "baca",
    wa: "sembunyikan",
    user_management: "sembunyikan",
  },
};

export function getDefaultPermissions(role: AppRole): UserPermissions {
  return { ...DEFAULT_PERMISSIONS_BY_ROLE[role] };
}

export function normalizePermissions(
  raw?: Partial<UserPermissions> | null,
  role: AppRole = "viewer"
): UserPermissions {
  const base = getDefaultPermissions(role);
  if (!raw) return base;

  const result = { ...base };
  for (const m of SYSTEM_MODULES) {
    if (raw[m.key]) {
      result[m.key] = raw[m.key]!;
    }
  }
  return result;
}

export function canUserRead(
  permissions: UserPermissions | undefined,
  module: ModuleKey
): boolean {
  if (!permissions) return false;
  const level = permissions[module] || "sembunyikan";
  return level === "baca" || level === "edit";
}

export function canUserEdit(
  permissions: UserPermissions | undefined,
  module: ModuleKey
): boolean {
  if (!permissions) return false;
  return permissions[module] === "edit";
}

export function isModuleHidden(
  permissions: UserPermissions | undefined,
  module: ModuleKey
): boolean {
  if (!permissions) return true;
  return (permissions[module] || "sembunyikan") === "sembunyikan";
}

export function mapPathToModule(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/santri")) return "santri";
  if (pathname.startsWith("/halaqoh")) return "halaqoh";
  if (pathname.startsWith("/tahfidz/umum/kegiatan")) return "kegiatan";
  if (pathname.startsWith("/tahfidz/umum/juz-baru")) return "juz_baru";
  if (pathname.startsWith("/tahfidz/umum/evaluasi")) return "evaluasi";
  if (pathname.startsWith("/tahfidz/khotmil/15") || pathname.startsWith("/tahfidz/khotmil/rekap/15"))
    return "khotmil_15";
  if (pathname.startsWith("/tahfidz/khotmil/30") || pathname.startsWith("/tahfidz/khotmil/rekap/30"))
    return "khotmil_30";
  if (pathname.startsWith("/alat/flyer-khataman")) return "flyer";
  if (pathname.startsWith("/alat/kirim-wa")) return "wa";
  if (pathname.startsWith("/pengaturan")) return "user_management";
  return null;
}

/**
 * Mengambil peta seluruh perizinan pengguna dari app_settings
 */
export async function fetchAllUserPermissionsMap(): Promise<Record<string, any>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "USER_PERMISSIONS")
    .maybeSingle();

  if (data?.value && typeof data.value === "object") {
    return data.value;
  }
  return {};
}

/**
 * API Client Helpers untuk manajemen user oleh admin
 */
export async function fetchAdminUserList(): Promise<UserAccountItem[]> {
  const res = await fetch("/api/admin/users", { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Gagal memuat data pengguna.");
  }
  const data = await res.json();
  return data.users || [];
}

export async function createAdminUser(payload: {
  username: string;
  nama: string;
  password?: string;
  role: AppRole;
  halaqoh_kelas?: number | null;
  halaqoh_bagian?: string | null;
  permissions: UserPermissions;
}): Promise<UserAccountItem> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Gagal membuat pengguna baru.");
  }
  return data.user;
}

export async function updateAdminUser(
  userId: string,
  payload: {
    nama?: string;
    username?: string;
    password?: string;
    role?: AppRole;
    status?: "active" | "suspended";
    halaqoh_kelas?: number | null;
    halaqoh_bagian?: string | null;
    permissions?: UserPermissions;
  }
): Promise<UserAccountItem> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Gagal memperbarui pengguna.");
  }
  return data.user;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Gagal menghapus pengguna.");
  }
}
