import { createClient } from "@/lib/supabase/client";
import type {
  AbsensiRecord,
  JenisKhotmil,
  KhotmilNilaiRecord,
  Profile,
  Santri,
  SesiAbsen,
  SetoranBulananRow,
  StatusAbsen,
  TipeSetoran,
} from "@/types/database";

const SANTRI_COLUMNS =
  "id, no_urut, kode, nama_lengkap, no_wa, blok, asrama, kode_kamar, kamar, halaqoh_kelas, halaqoh_bagian, halaqoh, created_at, updated_at";
const SANTRI_FALLBACK_COLUMNS =
  "id, no_urut, kode, nama_lengkap, blok, asrama, kamar, halaqoh_kelas, halaqoh_bagian, halaqoh, created_at, updated_at";

export interface SantriFilterParams {
  search?: string;
  asrama?: string;
  blok?: string;
  kode_kamar?: string;
  kamar?: string;
  halaqoh_kelas?: number | "";
  halaqoh_bagian?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchCurrentUserProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, nama, role, halaqoh_kelas, halaqoh_bagian, created_at")
    .eq("user_id", user.id)
    .single();

  if (data) return data as Profile;

  return {
    user_id: user.id,
    email: user.email ?? null,
    nama: user.email ? user.email.split("@")[0] : "Pengguna",
    role: "viewer",
    halaqoh_kelas: null,
    halaqoh_bagian: null,
    created_at: new Date().toISOString(),
  };
}

// Karakter berikut bermakna khusus di sintaks filter PostgREST (.or) atau sebagai wildcard ilike.
// Dibuang dari input agar pencarian tidak error atau melebar ke semua baris.
function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()"'\\%*_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SantriFilterOnly = Omit<SantriFilterParams, "page" | "pageSize">;

// Tipe builder Supabase sangat dalam; dipersempit ke dua method yang dipakai agar compiler tidak
// menelusuri seluruh tipenya (TS2589).
interface FilterableQuery {
  or(filters: string): FilterableQuery;
  eq(column: string, value: string | number): FilterableQuery;
}

function applySantriFilters<T>(query: T, params: SantriFilterOnly): T {
  let q = query as unknown as FilterableQuery;

  const term = params.search ? sanitizeSearchTerm(params.search) : "";
  if (term !== "") {
    q = q.or(`nama_lengkap.ilike.%${term}%,kode.ilike.%${term}%`);
  }
  if (params.asrama) q = q.eq("asrama", params.asrama);
  if (params.blok) q = q.eq("blok", params.blok);
  if (params.kode_kamar) q = q.eq("kode_kamar", params.kode_kamar);
  if (params.kamar) q = q.eq("kamar", params.kamar);
  if (params.halaqoh_kelas) q = q.eq("halaqoh_kelas", Number(params.halaqoh_kelas));
  if (params.halaqoh_bagian) q = q.eq("halaqoh_bagian", params.halaqoh_bagian);

  return q as unknown as T;
}

export async function fetchSantriPaginated(params: SantriFilterParams) {
  const supabase = createClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Coba muat dengan kolom lengkap
  try {
    const query = applySantriFilters(
      supabase
        .from("santri")
        .select(SANTRI_COLUMNS, { count: "exact" })
        .order("halaqoh_kelas", { ascending: true })
        .order("halaqoh_bagian", { ascending: true })
        .order("nama_lengkap", { ascending: true }),
      params
    );

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    return {
      rows: (data ?? []) as Santri[],
      total: count ?? 0,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Jika Supabase belum menambahkan kolom no_wa / kode_kamar, gunakan fallback
    if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
      const fallbackQuery = applySantriFilters(
        supabase
          .from("santri")
          .select(SANTRI_FALLBACK_COLUMNS, { count: "exact" })
          .order("halaqoh_kelas", { ascending: true })
          .order("halaqoh_bagian", { ascending: true })
          .order("nama_lengkap", { ascending: true }),
        params
      );
      const { data, count, error } = await fallbackQuery.range(from, to);
      if (error) throw new Error(error.message);
      return {
        rows: (data ?? []) as Santri[],
        total: count ?? 0,
      };
    }
    throw new Error(errorMsg);
  }
}

// Supabase membatasi satu respons (default 1000 baris), jadi data diambil bertahap hingga habis.
const FETCH_ALL_PAGE_SIZE = 1000;

export async function fetchAllSantriFiltered(params: SantriFilterOnly) {
  const supabase = createClient();
  const all: Santri[] = [];

  for (let from = 0; ; from += FETCH_ALL_PAGE_SIZE) {
    try {
      const query = applySantriFilters(
        supabase
          .from("santri")
          .select(SANTRI_COLUMNS)
          .order("halaqoh_kelas", { ascending: true })
          .order("halaqoh_bagian", { ascending: true })
          .order("nama_lengkap", { ascending: true })
          .order("id", { ascending: true }),
        params
      );

      const { data, error } = await query.range(from, from + FETCH_ALL_PAGE_SIZE - 1);
      if (error) throw error;

      const batch = (data ?? []) as Santri[];
      all.push(...batch);
      if (batch.length < FETCH_ALL_PAGE_SIZE) break;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
        const fallbackQuery = applySantriFilters(
          supabase
            .from("santri")
            .select(SANTRI_FALLBACK_COLUMNS)
            .order("halaqoh_kelas", { ascending: true })
            .order("halaqoh_bagian", { ascending: true })
            .order("nama_lengkap", { ascending: true })
            .order("id", { ascending: true }),
          params
        );
        const { data, error } = await fallbackQuery.range(from, from + FETCH_ALL_PAGE_SIZE - 1);
        if (error) throw new Error(error.message);
        const batch = (data ?? []) as Santri[];
        all.push(...batch);
        if (batch.length < FETCH_ALL_PAGE_SIZE) break;
      } else {
        throw new Error(errorMsg);
      }
    }
  }

  return all;
}

export async function saveSantri(
  payload: Omit<Santri, "id" | "no_urut" | "halaqoh" | "created_at" | "updated_at">,
  id?: string
) {
  const supabase = createClient();
  try {
    if (id) {
      const { error } = await supabase.from("santri").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("santri").insert(payload);
      if (error) throw error;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Jika kolom baru belum ada di Supabase, coba simpan tanpa kolom tersebut
    if (errorMsg.includes("no_wa") || errorMsg.includes("kode_kamar")) {
      const { no_wa: _wa, kode_kamar: _kk, ...fallbackPayload } = payload;
      if (id) {
        const { error } = await supabase.from("santri").update(fallbackPayload).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("santri").insert(fallbackPayload);
        if (error) throw new Error(error.message);
      }
      return;
    }
    throw new Error(errorMsg);
  }
}

export async function deleteSantriById(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("santri").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSantriBatch(ids: string[]) {
  if (!ids || ids.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("santri").delete().in("id", ids);
  if (error) throw new Error(error.message);
}

export async function deleteAllSantri() {
  const supabase = createClient();
  const { error } = await supabase.from("santri").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}

export async function deleteSetoranBatch(params: {
  santri_ids: string[];
  tipe: TipeSetoran;
  tahun: number;
}) {
  if (!params.santri_ids || params.santri_ids.length === 0) return;
  const supabase = createClient();
  const startYear = `${params.tahun}-01-01`;
  const endYear = `${params.tahun}-12-31`;
  const { error } = await supabase
    .from("setoran")
    .delete()
    .in("santri_id", params.santri_ids)
    .eq("tipe", params.tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear);
  if (error) throw new Error(error.message);
}

export async function deleteAllSetoran(params: {
  tipe: TipeSetoran;
  tahun: number;
}) {
  const supabase = createClient();
  const startYear = `${params.tahun}-01-01`;
  const endYear = `${params.tahun}-12-31`;
  const { error } = await supabase
    .from("setoran")
    .delete()
    .eq("tipe", params.tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear);
  if (error) throw new Error(error.message);
}

export async function fetchAbsensiBulan(
  tahun: number,
  bulan: number,
  sesi?: SesiAbsen | "semua"
) {
  const supabase = createClient();
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let query = supabase
    .from("absensi")
    .select("id, santri_id, tanggal, sesi, status, penginput")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate);

  if (sesi && sesi !== "semua") {
    query = query.eq("sesi", sesi);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as AbsensiRecord[];
}

/**
 * Mengambil rekap jumlah ketidakhadiran (alfa) per santri untuk bulan & tahun tertentu.
 * Menggabungkan seluruh sesi (pagi & malam) dari tabel absensi.
 * Digunakan untuk menampilkan badge status kehadiran di kartu halaqoh santri:
 * - Hijau: tidak ada alfa (0)
 * - Kuning: alfa > 3x (misal 4-5)
 * - Merah: alfa > 5x (misal > 5)
 */
export async function fetchSantriAlfaCounts(
  tahun: number,
  bulan: number
): Promise<Record<string, number>> {
  const supabase = createClient();
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  try {
    const { data, error } = await supabase
      .from("absensi")
      .select("santri_id, status")
      .gte("tanggal", startDate)
      .lte("tanggal", endDate);

    if (error) {
      console.error("Gagal mengambil data alfa absensi:", error);
      return {};
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const st = String(row.status || "").toLowerCase();
      if (st === "alfa" || st === "a") {
        if (row.santri_id) {
          counts[row.santri_id] = (counts[row.santri_id] || 0) + 1;
        }
      }
    }
    return counts;
  } catch (err) {
    console.error("Error fetchSantriAlfaCounts:", err);
    return {};
  }
}

/**
 * Mendapatkan objek waktu saat ini dalam zona waktu WIB (UTC+7).
 */
export function getWibNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 7 * 3600000);
}

/**
 * Memeriksa apakah suatu tanggal dan sesi absensi sudah atau sedang berjalan (WIB).
 * Aturan waktu:
 * - Pagi: aktif mulai pukul 04.00 WIB
 * - Malam: aktif mulai pukul 17.00 WIB
 * Hari sebelum hari ini: sudah lewat (true).
 * Hari ini: aktif sesuai jam sesi (Pagi >= 04.00 WIB, Malam >= 17.00 WIB).
 * Hari mendatang: belum berjalan (false).
 */
export function isSessionPastOrCurrent(
  targetYear: number,
  targetMonth: number, // 1 - 12
  targetDay: number,
  sesi: SesiAbsen,
  nowWib: Date = getWibNow()
): boolean {
  const currentYear = nowWib.getFullYear();
  const currentMonth = nowWib.getMonth() + 1;
  const currentDay = nowWib.getDate();
  const currentHour = nowWib.getHours();

  if (targetYear < currentYear) return true;
  if (targetYear > currentYear) return false;

  if (targetMonth < currentMonth) return true;
  if (targetMonth > currentMonth) return false;

  if (targetDay < currentDay) return true;
  if (targetDay > currentDay) return false;

  // targetDay === currentDay (Hari Ini)
  if (sesi === "pagi") {
    return currentHour >= 4;
  }
  if (sesi === "malam") {
    return currentHour >= 17;
  }

  return false;
}

export async function upsertAbsensiCell(params: {
  santri_id: string;
  tanggal: string;
  sesi: SesiAbsen;
  status: StatusAbsen | "";
}) {
  const supabase = createClient();
  if (params.status === "") {
    const { error } = await supabase
      .from("absensi")
      .delete()
      .eq("santri_id", params.santri_id)
      .eq("tanggal", params.tanggal)
      .eq("sesi", params.sesi);
    if (error) throw new Error(error.message);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("absensi").upsert(
    {
      santri_id: params.santri_id,
      tanggal: params.tanggal,
      sesi: params.sesi,
      status: params.status,
      penginput: user?.id ?? null,
    },
    { onConflict: "santri_id,tanggal,sesi" }
  );

  if (error) throw new Error(error.message);
}

/**
 * Menyimpan beberapa status absensi sekaligus secara batch ke tabel absensi Supabase.
 * Menggunakan upsert dengan onConflict: "santri_id,tanggal,sesi".
 */
export async function upsertAbsensiBatch(
  records: {
    santri_id: string;
    tanggal: string;
    sesi: SesiAbsen;
    status: StatusAbsen;
  }[]
) {
  if (!records || records.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = records.map((r) => ({
    santri_id: r.santri_id,
    tanggal: r.tanggal,
    sesi: r.sesi,
    status: r.status,
    penginput: user?.id ?? null,
  }));

  // Batch dalam chunk 200 baris agar tidak melebihi batasan ukuran payload Supabase
  const CHUNK_SIZE = 200;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("absensi")
      .upsert(chunk, { onConflict: "santri_id,tanggal,sesi" });
    if (error) throw new Error(error.message);
  }
}

export async function fetchSetoranBulananMerged(
  tahun: number,
  tipe: TipeSetoran,
  filter: Omit<SantriFilterParams, "page" | "pageSize">
): Promise<SetoranBulananRow[]> {
  const supabase = createClient();
  const santriList = await fetchAllSantriFiltered(filter);

  const { data: rekapRows, error } = await supabase
    .from("v_setoran_bulanan")
    .select(
      "santri_id, jan, feb, mar, apr, mei, jun, jul, agu, sep, okt, nov, des, total_setoran"
    )
    .eq("tahun", tahun)
    .eq("tipe", tipe);

  if (error) throw new Error(error.message);

  const rekapMap = new Map<string, Record<string, number>>();
  (rekapRows ?? []).forEach((r) => {
    rekapMap.set(r.santri_id, {
      jan: Number(r.jan ?? 0),
      feb: Number(r.feb ?? 0),
      mar: Number(r.mar ?? 0),
      apr: Number(r.apr ?? 0),
      mei: Number(r.mei ?? 0),
      jun: Number(r.jun ?? 0),
      jul: Number(r.jul ?? 0),
      agu: Number(r.agu ?? 0),
      sep: Number(r.sep ?? 0),
      okt: Number(r.okt ?? 0),
      nov: Number(r.nov ?? 0),
      des: Number(r.des ?? 0),
      total_setoran: Number(r.total_setoran ?? 0),
    });
  });

  return santriList.map((s) => {
    const val = rekapMap.get(s.id);
    return {
      santri_id: s.id,
      no_urut: s.no_urut,
      kode: s.kode,
      nama_lengkap: s.nama_lengkap,
      blok: s.blok,
      asrama: s.asrama,
      kode_kamar: s.kode_kamar,
      kamar: s.kamar,
      halaqoh_kelas: s.halaqoh_kelas,
      halaqoh_bagian: s.halaqoh_bagian,
      halaqoh: s.halaqoh,
      jan: val?.jan ?? 0,
      feb: val?.feb ?? 0,
      mar: val?.mar ?? 0,
      apr: val?.apr ?? 0,
      mei: val?.mei ?? 0,
      jun: val?.jun ?? 0,
      jul: val?.jul ?? 0,
      agu: val?.agu ?? 0,
      sep: val?.sep ?? 0,
      okt: val?.okt ?? 0,
      nov: val?.nov ?? 0,
      des: val?.des ?? 0,
      total_setoran: val?.total_setoran ?? 0,
    };
  });
}

/**
 * Mengambil seluruh log setoran santri untuk 1 tahun tertentu, lengkap dengan catatan per tanggal.
 */
export async function fetchSantriSetoranDetailTahun(
  santri_id: string,
  tahun: number,
  tipe: TipeSetoran = "juz_baru"
) {
  const supabase = createClient();
  const startYear = `${tahun}-01-01`;
  const endYear = `${tahun}-12-31`;

  const { data, error } = await supabase
    .from("setoran")
    .select("id, santri_id, tanggal, tipe, jumlah_juz_tambahan, catatan, created_at")
    .eq("santri_id", santri_id)
    .eq("tipe", tipe)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear)
    .order("tanggal", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as {
    id: string;
    santri_id: string;
    tanggal: string;
    tipe: TipeSetoran;
    jumlah_juz_tambahan: number;
    catatan: string | null;
    created_at: string;
  }[];
}

/**
 * Menyimpan / memperbarui jumlah juz dan catatan untuk bulan tertentu secara langsung tanpa membuka pop-up tambah log.
 */
export async function saveSetoranBulanDirect(params: {
  santri_id: string;
  tahun: number;
  bulan: number; // 1 - 12
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  catatan?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const startDate = `${params.tahun}-${String(params.bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(params.tahun, params.bulan, 0).getDate();
  const endDate = `${params.tahun}-${String(params.bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Ambil record yang sudah ada di bulan tersebut
  const { data: existing, error: fetchErr } = await supabase
    .from("setoran")
    .select("id, jumlah_juz_tambahan, catatan")
    .eq("santri_id", params.santri_id)
    .eq("tipe", params.tipe)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate);

  if (fetchErr) throw new Error(fetchErr.message);

  if (params.jumlah_juz_tambahan <= 0) {
    // Jika diset ke 0 atau negatif, hapus record di bulan ini
    if (existing && existing.length > 0) {
      const ids = existing.map((r) => r.id);
      const { error: delErr } = await supabase.from("setoran").delete().in("id", ids);
      if (delErr) throw new Error(delErr.message);
    }
    return;
  }

  if (existing && existing.length > 0) {
    // Update record pertama
    const firstId = existing[0].id;
    const updatePayload: Record<string, unknown> = {
      jumlah_juz_tambahan: params.jumlah_juz_tambahan,
      penginput: user?.id ?? null,
    };
    if (params.catatan !== undefined) {
      updatePayload.catatan = params.catatan.trim() || null;
    }
    const { error: updErr } = await supabase
      .from("setoran")
      .update(updatePayload)
      .eq("id", firstId);
    if (updErr) throw new Error(updErr.message);

    // Bersihkan duplikat jika ada lebih dari 1 record di bulan yang sama
    if (existing.length > 1) {
      const duplicateIds = existing.slice(1).map((r) => r.id);
      await supabase.from("setoran").delete().in("id", duplicateIds);
    }
  } else {
    // Insert baru
    const { error: insErr } = await supabase.from("setoran").insert({
      santri_id: params.santri_id,
      tanggal: startDate,
      tipe: params.tipe,
      jumlah_juz_tambahan: params.jumlah_juz_tambahan,
      catatan: params.catatan?.trim() || null,
      penginput: user?.id ?? null,
    });
    if (insErr) throw new Error(insErr.message);
  }
}

export async function insertSetoranLog(payload: {
  santri_id: string;
  tanggal: string;
  tipe: TipeSetoran;
  jumlah_juz_tambahan: number;
  catatan?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("setoran").insert({
    santri_id: payload.santri_id,
    tanggal: payload.tanggal,
    tipe: payload.tipe,
    jumlah_juz_tambahan: payload.jumlah_juz_tambahan,
    catatan: payload.catatan ?? null,
    penginput: user?.id ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function fetchKhotmilTahapNilai(jenis: JenisKhotmil, tahap: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_nilai")
    .select("id, santri_id, jenis, tahap, juz, nilai")
    .eq("jenis", jenis)
    .eq("tahap", tahap);

  if (error) throw new Error(error.message);
  return (data ?? []) as KhotmilNilaiRecord[];
}

/**
 * Mengambil seluruh catatan nilai khotmil untuk semua tahap pada jenis tertentu (15 Juz / 30 Juz).
 */
export async function fetchKhotmilAllNilai(jenis: JenisKhotmil): Promise<KhotmilNilaiRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_nilai")
    .select("id, santri_id, jenis, tahap, juz, nilai")
    .eq("jenis", jenis);

  if (error) throw new Error(error.message);
  return (data ?? []) as KhotmilNilaiRecord[];
}

export async function upsertKhotmilNilaiBatch(
  santri_id: string,
  jenis: JenisKhotmil,
  tahap: number,
  scores: { juz: number; nilai: number }[]
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = scores.map((item) => ({
    santri_id,
    jenis,
    tahap,
    juz: item.juz,
    nilai: item.nilai,
    penginput: user?.id ?? null,
  }));

  const { error } = await supabase
    .from("khotmil_nilai")
    .upsert(rows, { onConflict: "santri_id,jenis,tahap,juz" });

  if (error) throw new Error(error.message);
}

/**
 * Mengambil riwayat absensi seorang santri dalam tahun tertentu.
 */
export async function fetchSantriAbsensiDetail(santri_id: string, tahun: number) {
  const supabase = createClient();
  const startYear = `${tahun}-01-01`;
  const endYear = `${tahun}-12-31`;

  const { data, error } = await supabase
    .from("absensi")
    .select("id, santri_id, tanggal, sesi, status, penginput, created_at")
    .eq("santri_id", santri_id)
    .gte("tanggal", startYear)
    .lte("tanggal", endYear)
    .order("tanggal", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Mengambil pemetaan pembimbing halaqoh dari tabel profiles.
 */
export async function fetchPembimbingMap(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("nama, role, halaqoh_kelas, halaqoh_bagian")
    .not("halaqoh_kelas", "is", null)
    .not("halaqoh_bagian", "is", null);

  if (error) {
    console.error("Gagal memuat pembimbing halaqoh:", error);
    return {};
  }

  const map: Record<string, string> = {};
  for (const p of data || []) {
    if (p.nama && p.halaqoh_kelas && p.halaqoh_bagian) {
      map[`${p.halaqoh_kelas}_${p.halaqoh_bagian}`] = p.nama;
    }
  }
  return map;
}

/**
 * Mengambil ID santri yang pernah memiliki catatan nilai khotmil untuk jenis tertentu.
 */
export async function fetchKhotmilRegisteredSantriIds(
  jenis: JenisKhotmil
): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_nilai")
    .select("santri_id")
    .eq("jenis", jenis);

  if (error) {
    console.error("Gagal memuat id santri khotmil:", error);
    return [];
  }

  const ids = Array.from(new Set((data || []).map((row) => row.santri_id).filter(Boolean)));
  return ids;
}

