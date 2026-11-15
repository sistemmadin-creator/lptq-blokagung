import { createClient } from "@/lib/supabase/client";
import {
  fetchAllSantriFiltered,
  fetchKhotmilAllNilai,
  fetchKhotmilRegisteredSantriIds,
  fetchPembimbingMap,
} from "@/lib/services/tahfidz-service";
import {
  KHOTMIL_15_TAHAP,
  KHOTMIL_30_TAHAP,
  KKM_DEFAULT,
  type AngkatanTahapSnapshot,
  type JenisKhotmil,
  type KhotmilAngkatanPesertaRecord,
  type KhotmilAngkatanRecord,
  type KhotmilNilaiRecord,
  type Santri,
  type TahapConfig,
} from "@/types/database";

export interface EligibleGraduateCandidate {
  santri: Santri;
  pembimbing: string;
  nilai_tahap_json: AngkatanTahapSnapshot[];
  rata_rata_akhir: number | null;
  jumlah_tahap_tuntas: number;
  total_tahap: number;
  status_kelulusan: "lulus";
}

function formatKamarString(kodeKamar?: string | null, kamar?: string | null): string {
  const kKode = (kodeKamar || "").trim();
  const kKamar = (kamar || "").trim();
  if (!kKode && !kKamar) return "-";
  if (kKode && kKamar) {
    return kKamar.toUpperCase().startsWith(kKode.toUpperCase())
      ? kKamar
      : `${kKode}${kamar}`;
  }
  return kKode || kKamar;
}

/**
 * Mengambil seluruh daftar angkatan untuk jenis Khotmil tertentu beserta jumlah pesertanya.
 */
export async function fetchAngkatanList(
  jenis: JenisKhotmil
): Promise<KhotmilAngkatanRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_angkatan")
    .select(
      "id, jenis, nama_angkatan, tanggal_khataman, keterangan, created_by, created_at, updated_at, khotmil_angkatan_peserta(count)"
    )
    .eq("jenis", jenis)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    jenis: row.jenis as JenisKhotmil,
    nama_angkatan: String(row.nama_angkatan),
    tanggal_khataman: row.tanggal_khataman ?? null,
    keterangan: row.keterangan ?? null,
    created_by: row.created_by ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    jumlah_peserta: Number(row.khotmil_angkatan_peserta?.[0]?.count ?? 0),
  }));
}

/**
 * Membuat angkatan baru dengan nama/tahun custom.
 */
export async function createAngkatan(params: {
  jenis: JenisKhotmil;
  nama_angkatan: string;
  tanggal_khataman?: string | null;
  keterangan?: string | null;
}): Promise<KhotmilAngkatanRecord> {
  const nama = params.nama_angkatan.trim();
  if (!nama) {
    throw new Error("Nama / tahun angkatan wajib diisi.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("khotmil_angkatan")
    .insert({
      jenis: params.jenis,
      nama_angkatan: nama,
      tanggal_khataman: params.tanggal_khataman || null,
      keterangan: params.keterangan?.trim() || null,
      created_by: user?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Angkatan "${nama}" sudah terdaftar. Gunakan nama/tahun lain.`);
    }
    throw new Error(error.message);
  }

  return {
    ...(data as KhotmilAngkatanRecord),
    jumlah_peserta: 0,
  };
}

/**
 * Mengubah nama/tahun custom atau metadata angkatan yang sudah ada.
 */
export async function updateAngkatan(
  id: string,
  params: {
    nama_angkatan: string;
    tanggal_khataman?: string | null;
    keterangan?: string | null;
  }
): Promise<KhotmilAngkatanRecord> {
  const nama = params.nama_angkatan.trim();
  if (!nama) {
    throw new Error("Nama / tahun angkatan wajib diisi.");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_angkatan")
    .update({
      nama_angkatan: nama,
      tanggal_khataman: params.tanggal_khataman || null,
      keterangan: params.keterangan?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Angkatan "${nama}" sudah digunakan. Pilih nama/tahun lain.`);
    }
    throw new Error(error.message);
  }

  return data as KhotmilAngkatanRecord;
}

/**
 * Menghapus angkatan beserta seluruh snapshot pesertanya (CASCADE).
 */
export async function deleteAngkatan(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("khotmil_angkatan").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Mengambil seluruh peserta dalam satu angkatan tertentu.
 */
export async function fetchAngkatanPeserta(
  angkatanId: string
): Promise<KhotmilAngkatanPesertaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_angkatan_peserta")
    .select("*")
    .eq("angkatan_id", angkatanId)
    .order("nama_lengkap", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as KhotmilAngkatanPesertaRecord[];
}

/**
 * Mengambil seluruh peserta lintas semua angkatan untuk jenis Khotmil tertentu.
 */
export async function fetchAllAngkatanPesertaByJenis(
  jenis: JenisKhotmil
): Promise<KhotmilAngkatanPesertaRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("khotmil_angkatan_peserta")
    .select("*, khotmil_angkatan!inner(nama_angkatan)")
    .eq("jenis", jenis)
    .order("created_at", { ascending: false })
    .order("nama_lengkap", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    ...(row as KhotmilAngkatanPesertaRecord),
    nama_angkatan: row.khotmil_angkatan?.nama_angkatan ?? "-",
  }));
}

/**
 * Mengambil santri Khotmil aktif yang sudah Tuntas / Lulus Penuh pada tahap akhir
 * (Tahap 5 untuk Khotmil 15 Juz, atau Tahap 9 untuk Khotmil 30 Juz) dan tanpa remidi.
 */
export async function fetchEligibleKhotmilGraduates(
  jenis: JenisKhotmil
): Promise<EligibleGraduateCandidate[]> {
  const tahapList: TahapConfig[] =
    jenis === "khotmil15" ? KHOTMIL_15_TAHAP : KHOTMIL_30_TAHAP;
  const finalTahapNum = jenis === "khotmil15" ? 5 : 9;

  const [allSantri, allNilai, registeredIds, pbMap] = await Promise.all([
    fetchAllSantriFiltered({}),
    fetchKhotmilAllNilai(jenis),
    fetchKhotmilRegisteredSantriIds(jenis),
    fetchPembimbingMap(),
  ]);

  const registeredSet = new Set(registeredIds);
  const nilaiLookup = new Map<string, number>();
  allNilai.forEach((n: KhotmilNilaiRecord) => {
    nilaiLookup.set(`${n.santri_id}_${n.tahap}_${n.juz}`, n.nilai);
  });

  const eligible: EligibleGraduateCandidate[] = [];

  allSantri
    .filter((s) => registeredSet.has(s.id))
    .forEach((santri) => {
      let totalScoreSum = 0;
      let totalEvaluatedJuz = 0;
      let jumlahTahapTuntas = 0;
      let hasRemidiAnywhere = false;
      let finalTahapLulus = false;

      const snapshots: AngkatanTahapSnapshot[] = tahapList.map((tCfg) => {
        const scores: { juz: number; nilai: number }[] = [];
        let tahapSum = 0;

        tCfg.juzList.forEach((j) => {
          const val = nilaiLookup.get(`${santri.id}_${tCfg.tahap}_${j}`);
          if (val !== undefined) {
            scores.push({ juz: j, nilai: val });
            tahapSum += val;
            totalScoreSum += val;
            totalEvaluatedJuz++;
          }
        });

        const isComplete = scores.length === tCfg.juzList.length;
        const average =
          scores.length > 0 ? Number((tahapSum / scores.length).toFixed(2)) : null;
        const hasRemidi = scores.some((sc) => sc.nilai < KKM_DEFAULT);
        const isLulus =
          isComplete && average !== null && average >= KKM_DEFAULT && !hasRemidi;

        if (hasRemidi) hasRemidiAnywhere = true;
        if (isLulus) jumlahTahapTuntas++;
        if (tCfg.tahap === finalTahapNum && isLulus) finalTahapLulus = true;

        return {
          tahap: tCfg.tahap,
          label: tCfg.label,
          rentangLabel: tCfg.rentangLabel,
          scores,
          average,
          isComplete,
          isLulus,
        };
      });

      // Syarat ketat: wajib lulus penuh pada tahap akhir (Tahap 5 / Tahap 9) & tidak memiliki remidi
      if (!finalTahapLulus || hasRemidiAnywhere) return;

      const pembimbing =
        pbMap[`${santri.halaqoh_kelas}_${santri.halaqoh_bagian}`] || "Ust. Pembimbing";

      eligible.push({
        santri,
        pembimbing,
        nilai_tahap_json: snapshots,
        rata_rata_akhir:
          totalEvaluatedJuz > 0
            ? Number((totalScoreSum / totalEvaluatedJuz).toFixed(2))
            : null,
        jumlah_tahap_tuntas: jumlahTahapTuntas,
        total_tahap: tahapList.length,
        status_kelulusan: "lulus",
      });
    });

  return eligible;
}

/**
 * Mengarsipkan lulusan Khotmil terpilih ke dalam angkatan SQL (Write-Before-Delete).
 * Jika removeFromActiveKhotmil = true, kepesertaan & nilai aktif di khotmil_peserta/nilai
 * langsung dibersihkan setelah snapshot tersimpan agar tabel aktif siap untuk periode baru.
 */
export async function archiveGraduatesToAngkatan(params: {
  angkatanId: string;
  angkatanName: string;
  jenis: JenisKhotmil;
  candidates: EligibleGraduateCandidate[];
  removeFromActiveKhotmil: boolean;
  catatan?: string;
}): Promise<{ archivedCount: number; removedActiveCount: number }> {
  const {
    angkatanId,
    angkatanName,
    jenis,
    candidates,
    removeFromActiveKhotmil,
    catatan,
  } = params;

  if (!candidates || candidates.length === 0) {
    return { archivedCount: 0, removedActiveCount: 0 };
  }

  const supabase = createClient();
  const rows = candidates.map((c) => ({
    angkatan_id: angkatanId,
    santri_id: c.santri.id,
    jenis,
    kode_santri: c.santri.kode || "-",
    nama_lengkap: c.santri.nama_lengkap,
    asrama: c.santri.asrama || "-",
    kode_kamar: c.santri.kode_kamar ?? null,
    kamar: formatKamarString(c.santri.kode_kamar, c.santri.kamar),
    halaqoh_kelas: c.santri.halaqoh_kelas ?? null,
    halaqoh_bagian: c.santri.halaqoh_bagian ?? null,
    halaqoh: c.santri.halaqoh || `${c.santri.halaqoh_kelas ?? ""}${c.santri.halaqoh_bagian ?? ""}` || "-",
    pembimbing: c.pembimbing || "-",
    nilai_tahap_json: c.nilai_tahap_json,
    rata_rata_akhir: c.rata_rata_akhir,
    jumlah_tahap_tuntas: c.jumlah_tahap_tuntas,
    total_tahap: c.total_tahap,
    status_kelulusan: c.status_kelulusan,
    sumber: "tarik_khotmil",
    catatan: catatan?.trim() || null,
  }));

  const { error: upsertErr } = await supabase
    .from("khotmil_angkatan_peserta")
    .upsert(rows, { onConflict: "angkatan_id,santri_id" });

  if (upsertErr) {
    throw new Error("Gagal menyimpan snapshot angkatan: " + upsertErr.message);
  }

  let removedActiveCount = 0;

  if (removeFromActiveKhotmil) {
    const santriIds = candidates.map((c) => c.santri.id);
    const { error: delPesertaErr } = await supabase
      .from("khotmil_peserta")
      .delete()
      .in("santri_id", santriIds)
      .eq("jenis", jenis);

    if (delPesertaErr) {
      throw new Error(
        "Snapshot tersimpan, tetapi gagal membersihkan peserta Khotmil aktif: " +
          delPesertaErr.message
      );
    }

    const { error: delNilaiErr } = await supabase
      .from("khotmil_nilai")
      .delete()
      .in("santri_id", santriIds)
      .eq("jenis", jenis);

    if (delNilaiErr) {
      throw new Error(
        "Snapshot tersimpan, tetapi gagal membersihkan nilai Khotmil aktif: " +
          delNilaiErr.message
      );
    }

    removedActiveCount = santriIds.length;
  }

  if (typeof window !== "undefined") {
    try {
      const programLabel = jenis === "khotmil15" ? "Khotmil 15 Juz" : "Khotmil 30 Juz";
      await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logAction: "ARCHIVE_KHOTMIL_ANGKATAN",
          kategori: "Penilaian Tahfidz",
          deskripsi: `Mengarsipkan ${candidates.length} santri lulusan ${programLabel} ke Database Angkatan "${angkatanName}"${
            removeFromActiveKhotmil ? " (data tabel aktif dibersihkan)" : ""
          }.`,
        }),
      });
    } catch {
      // Non-blocking log
    }
  }

  return { archivedCount: candidates.length, removedActiveCount };
}

/**
 * Menambahkan santri/alumni secara manual ke angkatan tertentu (baik dari master santri maupun input biodata bebas untuk alumni lama).
 */
export async function addManualAlumniToAngkatan(params: {
  angkatanId: string;
  jenis: JenisKhotmil;
  santri?: Santri | null;
  pembimbing?: string;
  manualBiodata?: {
    kode_santri?: string;
    nama_lengkap: string;
    asrama?: string;
    kamar?: string;
    halaqoh?: string;
    pembimbing?: string;
  };
  rata_rata_akhir?: number | null;
  status_kelulusan?: "lulus" | "belum_tuntas";
  catatan?: string | null;
}): Promise<void> {
  const supabase = createClient();
  const totalTahap =
    params.jenis === "khotmil15" ? KHOTMIL_15_TAHAP.length : KHOTMIL_30_TAHAP.length;
  const statusKelulusan = params.status_kelulusan ?? "lulus";

  if (params.santri) {
    const s = params.santri;
    const row = {
      angkatan_id: params.angkatanId,
      santri_id: s.id,
      jenis: params.jenis,
      kode_santri: s.kode || "-",
      nama_lengkap: s.nama_lengkap,
      asrama: s.asrama || "-",
      kode_kamar: s.kode_kamar ?? null,
      kamar: formatKamarString(s.kode_kamar, s.kamar),
      halaqoh_kelas: s.halaqoh_kelas ?? null,
      halaqoh_bagian: s.halaqoh_bagian ?? null,
      halaqoh: s.halaqoh || `${s.halaqoh_kelas ?? ""}${s.halaqoh_bagian ?? ""}` || "-",
      pembimbing: params.pembimbing || "-",
      nilai_tahap_json: [],
      rata_rata_akhir: params.rata_rata_akhir ?? null,
      jumlah_tahap_tuntas: statusKelulusan === "lulus" ? totalTahap : 0,
      total_tahap: totalTahap,
      status_kelulusan: statusKelulusan,
      sumber: "manual",
      catatan: params.catatan?.trim() || null,
    };

    const { error } = await supabase
      .from("khotmil_angkatan_peserta")
      .upsert(row, { onConflict: "angkatan_id,santri_id" });
    if (error) throw new Error(error.message);
    return;
  }

  const bio = params.manualBiodata;
  if (!bio || !bio.nama_lengkap.trim()) {
    throw new Error("Nama lengkap santri/alumni wajib diisi.");
  }

  const { error } = await supabase.from("khotmil_angkatan_peserta").insert({
    angkatan_id: params.angkatanId,
    santri_id: null,
    jenis: params.jenis,
    kode_santri: bio.kode_santri?.trim() || "-",
    nama_lengkap: bio.nama_lengkap.trim(),
    asrama: bio.asrama?.trim() || "-",
    kode_kamar: null,
    kamar: bio.kamar?.trim() || "-",
    halaqoh_kelas: null,
    halaqoh_bagian: null,
    halaqoh: bio.halaqoh?.trim() || "-",
    pembimbing: bio.pembimbing?.trim() || "-",
    nilai_tahap_json: [],
    rata_rata_akhir: params.rata_rata_akhir ?? null,
    jumlah_tahap_tuntas: statusKelulusan === "lulus" ? totalTahap : 0,
    total_tahap: totalTahap,
    status_kelulusan: statusKelulusan,
    sumber: "manual",
    catatan: params.catatan?.trim() || null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Menghapus 1 peserta dari arsip angkatan.
 */
export async function deleteAngkatanPeserta(pesertaId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("khotmil_angkatan_peserta")
    .delete()
    .eq("id", pesertaId);
  if (error) throw new Error(error.message);
}
