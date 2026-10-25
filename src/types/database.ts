export type AppRole = "admin" | "pengurus" | "pembimbing" | "operator_absen" | "viewer";
export type SesiAbsen = "pagi" | "malam";
export type StatusAbsen = "hadir" | "alfa" | "izin" | "sakit";
export type TipeSetoran = "juz_baru" | "evaluasi";
export type JenisKhotmil = "khotmil15" | "khotmil30";
export type HalaqohBagian = "A" | "B" | "C" | "D" | "E" | "F";

export type ModuleKey =
  | "dashboard"
  | "santri"
  | "halaqoh"
  | "kegiatan"
  | "juz_baru"
  | "evaluasi"
  | "khotmil_15"
  | "khotmil_30"
  | "flyer"
  | "wa"
  | "user_management";

export type PermissionLevel = "sembunyikan" | "baca" | "edit";

export type UserPermissions = Record<ModuleKey, PermissionLevel>;

export interface Profile {
  user_id: string;
  email: string | null;
  username?: string;
  nama: string | null;
  role: AppRole;
  halaqoh_kelas: number | null;
  halaqoh_bagian: HalaqohBagian | null;
  permissions?: UserPermissions;
  status?: "active" | "suspended";
  created_at: string;
}

export interface UserAccountItem {
  user_id: string;
  email: string;
  username: string;
  nama: string;
  role: AppRole;
  halaqoh_kelas?: number | null;
  halaqoh_bagian?: HalaqohBagian | null;
  status: "active" | "suspended";
  permissions: UserPermissions;
  created_at?: string;
  updated_at?: string;
}

export type LogKategori =
  | "Autentikasi"
  | "Manajemen Pengguna"
  | "Penilaian Tahfidz"
  | "Data Santri"
  | "Pengaturan Sistem"
  | "WhatsApp Gateway"
  | "Backup & Restore"
  | "Ekspor & Cetak"
  | "Lainnya";

export interface UserActivityLog {
  id: string;
  user_id: string;
  nama: string;
  username: string;
  role: AppRole | string;
  action: string;
  kategori: LogKategori;
  deskripsi: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Santri {
  id: string;
  no_urut: number;
  kode: string;
  nama_lengkap: string;
  no_wa?: string | null;
  blok: string;
  asrama: string;
  kode_kamar?: string | null;
  kamar: string;
  halaqoh_kelas: number;
  halaqoh_bagian: HalaqohBagian;
  halaqoh: string;
  created_at: string;
  updated_at: string;
}

export interface AbsensiRecord {
  id: string;
  santri_id: string;
  tanggal: string;
  sesi: SesiAbsen;
  status: StatusAbsen;
  penginput: string | null;
}

export interface SetoranRecord {
  id: string;
  santri_id: string;
  tanggal: string;
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  catatan: string | null;
  penginput: string | null;
  created_at: string;
}

export interface SetoranBulananRow {
  santri_id: string;
  no_urut: number;
  kode: string;
  nama_lengkap: string;
  blok: string;
  asrama: string;
  kode_kamar?: string | null;
  kamar: string;
  halaqoh_kelas: number;
  halaqoh_bagian: HalaqohBagian;
  halaqoh: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  mei: number;
  jun: number;
  jul: number;
  agu: number;
  sep: number;
  okt: number;
  nov: number;
  des: number;
  total_setoran: number;
}

export interface KhotmilNilaiRecord {
  id: string;
  santri_id: string;
  jenis: JenisKhotmil;
  tahap: number;
  juz: number;
  nilai: number;
}

export interface TahapConfig {
  tahap: number;
  label: string;
  rentangLabel: string;
  juzList: number[];
}

export const HALAQOH_KELAS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const HALAQOH_BAGIAN_LIST: HalaqohBagian[] = ["A", "B", "C", "D", "E", "F"];

export const PEMETAAN_HALAQOH_KELAS: Record<number, string> = {
  1: "Juz 1 - 3",
  2: "Juz 4 - 6",
  3: "Juz 7 - 9",
  4: "Juz 10 - 12",
  5: "Juz 13 - 15",
  6: "Juz 16 - 18",
  7: "Juz 19 - 21",
  8: "Juz 22 - 24",
  9: "Juz 25 - 27",
  10: "Juz 28 - 30",
};

const rangeJuz = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, idx) => start + idx);

export const KHOTMIL_15_TAHAP: TahapConfig[] = [
  { tahap: 1, label: "Tahap 1", rentangLabel: "Juz 1 - 5", juzList: rangeJuz(1, 5) },
  { tahap: 2, label: "Tahap 2", rentangLabel: "Juz 6 - 10", juzList: rangeJuz(6, 10) },
  { tahap: 3, label: "Tahap 3", rentangLabel: "Juz 1 - 10", juzList: rangeJuz(1, 10) },
  { tahap: 4, label: "Tahap 4", rentangLabel: "Juz 11 - 15", juzList: rangeJuz(11, 15) },
  { tahap: 5, label: "Tahap 5", rentangLabel: "Juz 1 - 15", juzList: rangeJuz(1, 15) },
];

export const KHOTMIL_30_TAHAP: TahapConfig[] = [
  { tahap: 1, label: "Tahap 1", rentangLabel: "Juz 1 - 5", juzList: rangeJuz(1, 5) },
  { tahap: 2, label: "Tahap 2", rentangLabel: "Juz 6 - 10", juzList: rangeJuz(6, 10) },
  { tahap: 3, label: "Tahap 3", rentangLabel: "Juz 1 - 10", juzList: rangeJuz(1, 10) },
  { tahap: 4, label: "Tahap 4", rentangLabel: "Juz 11 - 15", juzList: rangeJuz(11, 15) },
  { tahap: 5, label: "Tahap 5", rentangLabel: "Juz 16 - 20", juzList: rangeJuz(16, 20) },
  { tahap: 6, label: "Tahap 6", rentangLabel: "Juz 11 - 20", juzList: rangeJuz(11, 20) },
  { tahap: 7, label: "Tahap 7", rentangLabel: "Juz 21 - 25", juzList: rangeJuz(21, 25) },
  { tahap: 8, label: "Tahap 8", rentangLabel: "Juz 26 - 30", juzList: rangeJuz(26, 30) },
  { tahap: 9, label: "Tahap 9", rentangLabel: "Juz 21 - 30", juzList: rangeJuz(21, 30) },
];

export const KKM_DEFAULT = 85;
