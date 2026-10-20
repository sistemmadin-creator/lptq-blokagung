import { NextResponse } from "next/server";
import { createServerSupabase, getUserRole } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

const IMPORT_ALLOWED_ROLES: AppRole[] = ["admin", "pengurus"];

interface RawSantriImportRow {
  Kode?: string | number;
  "Nama Lengkap"?: string;
  Blok?: string | number;
  Asrama?: string;
  Kamar?: string | number;
  "Halaqoh Kelas"?: number | string;
  "Halaqoh Bagian"?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, { status: 401 });
    }

    const role = await getUserRole(supabase, user.id);
    if (!IMPORT_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Peran Anda tidak diizinkan mengimpor data santri." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawRows = (body.rows ?? []) as RawSantriImportRow[];

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "Data baris impor kosong." }, { status: 400 });
    }

    const validBagian = new Set(["A", "B", "C", "D", "E", "F"]);
    const payload = rawRows.map((row, index) => {
      const kode = String(row.Kode ?? "").trim();
      const nama_lengkap = String(row["Nama Lengkap"] ?? "").trim();
      const blok = String(row.Blok ?? "-").trim() || "-";
      const asrama = String(row.Asrama ?? "").trim();
      const kamar = String(row.Kamar ?? "").trim();
      const halaqoh_kelas = Number(row["Halaqoh Kelas"]);
      const halaqoh_bagian = String(row["Halaqoh Bagian"] ?? "")
        .trim()
        .toUpperCase();

      if (
        !kode ||
        !nama_lengkap ||
        !asrama ||
        !kamar ||
        Number.isNaN(halaqoh_kelas) ||
        halaqoh_kelas < 1 ||
        halaqoh_kelas > 10 ||
        !validBagian.has(halaqoh_bagian)
      ) {
        throw new Error(
          `Data tidak valid pada baris ke-${index + 1} (Kode: ${kode || "kosong"}). Pastikan Kelas 1-10 dan Bagian A-F.`
        );
      }

      return {
        kode,
        nama_lengkap,
        blok,
        asrama,
        kamar,
        halaqoh_kelas,
        halaqoh_bagian,
      };
    });

    const { error } = await supabase
      .from("santri")
      .upsert(payload, { onConflict: "kode" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ count: payload.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kesalahan server saat impor santri.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
