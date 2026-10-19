import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

interface RawKhotmilImportRow {
  Kode?: string | number;
  Jenis?: string;
  Tahap?: number | string;
  Juz?: number | string;
  Nilai?: number | string;
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

    const body = await request.json();
    const rawRows = (body.rows ?? []) as RawKhotmilImportRow[];

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "Baris impor kosong." }, { status: 400 });
    }

    const kodeSet = Array.from(
      new Set(rawRows.map((r) => String(r.Kode ?? "").trim()).filter(Boolean))
    );

    const { data: santriData, error: santriErr } = await supabase
      .from("santri")
      .select("id, kode")
      .in("kode", kodeSet);

    if (santriErr) {
      return NextResponse.json({ error: santriErr.message }, { status: 400 });
    }

    const kodeToId = new Map<string, string>();
    (santriData ?? []).forEach((s) => kodeToId.set(s.kode, s.id));

    const upsertRows = rawRows.map((r, idx) => {
      const kode = String(r.Kode ?? "").trim();
      const santri_id = kodeToId.get(kode);
      const jenis = String(r.Jenis ?? "").trim().toLowerCase();
      const tahap = Number(r.Tahap);
      const juz = Number(r.Juz);
      const nilai = Number(r.Nilai);

      if (!santri_id) {
        throw new Error(`Kode santri "${kode}" pada baris ${idx + 1} tidak ditemukan di database.`);
      }
      if (jenis !== "khotmil15" && jenis !== "khotmil30") {
        throw new Error(`Jenis khotmil pada baris ${idx + 1} harus khotmil15 atau khotmil30.`);
      }
      if (Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
        throw new Error(`Nilai pada baris ${idx + 1} harus berada di antara 0 dan 100.`);
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

    return NextResponse.json({ count: upsertRows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kesalahan saat mengimpor nilai khotmil.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
