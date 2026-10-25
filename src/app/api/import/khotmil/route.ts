import { NextResponse } from "next/server";
import { createServerSupabase, getUserRole } from "@/lib/supabase/server";
import {
  KHOTMIL_15_TAHAP,
  KHOTMIL_30_TAHAP,
  type AppRole,
  type JenisKhotmil,
} from "@/types/database";

const IMPORT_ALLOWED_ROLES: AppRole[] = ["admin", "pengurus"];

const TAHAP_CONFIG: Record<JenisKhotmil, typeof KHOTMIL_15_TAHAP> = {
  khotmil15: KHOTMIL_15_TAHAP,
  khotmil30: KHOTMIL_30_TAHAP,
};

interface RawKhotmilImportRow {
  Kode?: string | number;
  kode?: string | number;
  santri?: string | number;
  Santri?: string | number;
  "Nama Santri"?: string;
  nama_lengkap?: string;
  Jenis?: string;
  jenis?: string;
  Tahap?: number | string;
  tahap?: number | string;
  Juz?: number | string;
  juz?: number | string;
  Nilai?: number | string;
  nilai?: number | string;
  [key: string]: unknown;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    if (!IMPORT_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Peran Anda tidak diizinkan mengimpor nilai khotmil." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawRows = (body.rows ?? []) as RawKhotmilImportRow[];

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "Baris impor kosong." }, { status: 400 });
    }

    // Ambil data santri untuk pencocokan pintar (id, kode, atau nama lengkap santri)
    const { data: santriData, error: santriErr } = await supabase
      .from("santri")
      .select("id, kode, nama_lengkap, asrama, halaqoh");

    if (santriErr) {
      return NextResponse.json({ error: santriErr.message }, { status: 400 });
    }

    const santriList = santriData ?? [];
    const idMap = new Map<string, string>();
    const kodeMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    const normalizedNameMap = new Map<string, string>();

    const normalizeText = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    santriList.forEach((s) => {
      idMap.set(s.id, s.id);
      if (s.kode) {
        kodeMap.set(s.kode.trim().toLowerCase(), s.id);
      }
      if (s.nama_lengkap) {
        nameMap.set(s.nama_lengkap.trim().toLowerCase(), s.id);
        const norm = normalizeText(s.nama_lengkap);
        if (norm) normalizedNameMap.set(norm, s.id);
      }
    });

    const findSantriId = (rawIdentifier: unknown): string | null => {
      const str = String(rawIdentifier ?? "").trim();
      if (!str) return null;

      // 1. Cek langsung ID
      if (idMap.has(str)) return idMap.get(str)!;

      const lower = str.toLowerCase();

      // 2. Cek kode persis (misal: S-7389594-8448 atau s-1001)
      if (kodeMap.has(lower)) return kodeMap.get(lower)!;

      // 3. Ekstrak pola kode santri di dalam string (misal: "Ashfina (S-7389594-8448)")
      const kodeMatch = str.match(/S-\d+(-\d+)?/i);
      if (kodeMatch && kodeMap.has(kodeMatch[0].toLowerCase())) {
        return kodeMap.get(kodeMatch[0].toLowerCase())!;
      }

      // 4. Cek nama lengkap persis
      if (nameMap.has(lower)) return nameMap.get(lower)!;

      // 5. Cek nama ternormalisasi (menghapus spasi ganda & tanda baca)
      const norm = normalizeText(str);
      if (normalizedNameMap.has(norm)) return normalizedNameMap.get(norm)!;

      // 6. Partial match jika unik
      const partialMatches = santriList.filter((s) => {
        const sNorm = normalizeText(s.nama_lengkap);
        return sNorm.includes(norm) || norm.includes(sNorm);
      });
      if (partialMatches.length === 1) {
        return partialMatches[0].id;
      }

      return null;
    };

    const upsertRows = rawRows.map((r, idx) => {
      const rawSantri =
        r.Santri ?? r.santri ?? r.Kode ?? r["Nama Santri"] ?? r.nama_lengkap ?? r.kode;
      const santri_id = findSantriId(rawSantri);
      const jenis = String(r.Jenis ?? r.jenis ?? body.jenis ?? "").trim().toLowerCase();
      const tahap = Number(r.Tahap ?? r.tahap ?? body.tahap);
      const juz = Number(r.Juz ?? r.juz);
      const nilai = Number(r.Nilai ?? r.nilai);

      if (!santri_id) {
        throw new Error(
          `Santri "${String(rawSantri || "tanpa nama")}" pada baris ${idx + 1} tidak ditemukan di database LPTQ. Pastikan nama santri sesuai dengan database.`
        );
      }
      if (jenis !== "khotmil15" && jenis !== "khotmil30") {
        throw new Error(`Jenis khotmil pada baris ${idx + 1} harus khotmil15 atau khotmil30.`);
      }
      if (Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
        throw new Error(`Nilai pada baris ${idx + 1} harus berupa angka antara 0 dan 100.`);
      }

      const tahapCfg = TAHAP_CONFIG[jenis as JenisKhotmil]?.find((t) => t.tahap === tahap);
      if (!Number.isInteger(tahap) || !tahapCfg) {
        throw new Error(
          `Tahap ${tahap} pada baris ${idx + 1} tidak valid untuk ${jenis} (tersedia tahap 1-${
            TAHAP_CONFIG[jenis as JenisKhotmil]?.length ?? 0
          }).`
        );
      }
      if (!Number.isInteger(juz) || !tahapCfg.juzList.includes(juz)) {
        throw new Error(
          `Juz ${juz || "kosong"} pada baris ${idx + 1} tidak termasuk dalam ${tahapCfg.label} (${tahapCfg.rentangLabel}).`
        );
      }

      return {
        santri_id,
        jenis,
        tahap,
        juz,
        nilai: Math.round(nilai),
        penginput: user.id,
      };
    });

    const { error } = await supabase
      .from("khotmil_nilai")
      .upsert(upsertRows, { onConflict: "santri_id,jenis,tahap,juz" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const registeredSantriIds = Array.from(new Set(upsertRows.map((u) => u.santri_id)));

    return NextResponse.json({
      count: upsertRows.length,
      registeredSantriIds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kesalahan saat mengimpor nilai khotmil.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
