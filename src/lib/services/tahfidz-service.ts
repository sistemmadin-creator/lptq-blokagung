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

export async function fetchAbsensiBulan(tahun: number, bulan: number, sesi: SesiAbsen) {
  const supabase = createClient();
  const startDate = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const lastDay = new Date(tahun, bulan, 0).getDate();
  const endDate = `${tahun}-${String(bulan).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("absensi")
    .select("id, santri_id, tanggal, sesi, status, penginput")
    .eq("sesi", sesi)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate);

  if (error) throw new Error(error.message);
  return (data ?? []) as AbsensiRecord[];
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
