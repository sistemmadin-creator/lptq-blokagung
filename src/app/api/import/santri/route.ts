import { NextResponse } from "next/server";
import { createServerSupabase, getUserRole } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

const IMPORT_ALLOWED_ROLES: AppRole[] = ["admin", "pengurus"];

interface RawSantriImportRow {
  Kode?: string | number;
  "Kode Santri"?: string | number;
  "Nama Lengkap"?: string;
  "Nomor WhatsApp"?: string | number;
  "No WhatsApp"?: string | number;
  WhatsApp?: string | number;
  Telepon?: string | number;
  "Penempatan Kamar (Hierarki)"?: string;
  "Penempatan Kamar"?: string;
  Hierarki?: string;
  Rute?: string;
  Blok?: string | number;
  Asrama?: string;
  "Kode Kamar"?: string | number;
  Kamar?: string | number;
  "Halaqoh Kelas"?: number | string;
  "Halaqoh Bagian"?: string;
  [key: string]: unknown;
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
      // Prioritaskan Kode Santri jika ada. Jika tidak ada (karena Kode Unik Santri telah
      // dihapus dari template), gunakan auto-generate unik dan kolom 'Kode' diperlakukan sebagai kode_kamar.
      let kode = String(row["Kode Santri"] ?? "").trim();
      let kode_kamar = String(row["Kode Kamar"] ?? "").trim();

      if (!kode_kamar && row.Kode) {
        kode_kamar = String(row.Kode).trim();
      }

      if (!kode) {
        // Auto-generate kode unik santri (contoh: S-98123-1)
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        kode = `S-${Date.now().toString().slice(-6)}${index + 1}-${randomPart}`;
      }

      const nama_lengkap = String(row["Nama Lengkap"] ?? "").trim();
      let blok = String(row.Blok ?? "").trim();
      let asrama = String(row.Asrama ?? "").trim();

      // Dukung pengisian melalui kolom Penempatan Kamar (Hierarki)
      const hierarki = String(
        row["Penempatan Kamar (Hierarki)"] ??
        row["Penempatan Kamar"] ??
        row.Hierarki ??
        row.Rute ??
        ""
      ).trim();

      if (hierarki && hierarki.includes(">")) {
        const parts = hierarki.split(">").map((s) => s.trim());
        if ((!blok || blok === "-") && parts[0]) blok = parts[0];
        if ((!asrama || asrama === "-") && parts[1]) asrama = parts[1];
        if ((!kode_kamar || kode_kamar === "-") && parts[2]) kode_kamar = parts[2];
      }

      // Blok, Asrama, Kode, dan Kamar boleh kosong: diisi "-" agar bisa dilengkapi lewat Edit.
      if (!blok) blok = "-";
      if (!asrama) asrama = "-";
      if (!kode_kamar) kode_kamar = "-";

      // Kamar ditulis apa adanya (2 atau 02 sama-sama diterima); angka dari Excel dinormalkan.
      const kamar = String(row.Kamar ?? "").trim() || "-";
      const no_wa = String(
        row["Nomor WhatsApp"] ?? row["No WhatsApp"] ?? row.WhatsApp ?? row.Telepon ?? ""
      ).trim();
      const halaqoh_kelas = Number(row["Halaqoh Kelas"]);
      const halaqoh_bagian = String(row["Halaqoh Bagian"] ?? "")
        .trim()
        .toUpperCase();

      if (
        !nama_lengkap ||
        Number.isNaN(halaqoh_kelas) ||
        halaqoh_kelas < 1 ||
        halaqoh_kelas > 10 ||
        !validBagian.has(halaqoh_bagian)
      ) {
        throw new Error(
          `Data tidak valid pada baris ke-${index + 1} (Nama: ${nama_lengkap || "kosong"}). Pastikan Nama terisi, Kelas 1-10 dan Bagian A-F.`
        );
      }

      return {
        kode,
        nama_lengkap,
        no_wa: no_wa || null,
        blok,
        asrama,
        kode_kamar,
        kamar,
        halaqoh_kelas,
        halaqoh_bagian,
      };
    });

    let { error } = await supabase
      .from("santri")
      .upsert(payload, { onConflict: "kode" });

    // Fallback jika Supabase belum menambahkan kolom no_wa / kode_kamar
    if (error && (error.message.includes("no_wa") || error.message.includes("kode_kamar"))) {
      const fallbackPayload = payload.map(({ no_wa: _wa, kode_kamar: _kk, ...rest }) => rest);
      const retryRes = await supabase
        .from("santri")
        .upsert(fallbackPayload, { onConflict: "kode" });
      error = retryRes.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ count: payload.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kesalahan server saat impor santri.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
