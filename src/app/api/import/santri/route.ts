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

    // Ambil data santri eksisting untuk mencocokkan nama agar tidak terjadi data dobel / menumpuk
    const { data: existingSantriData, error: fetchSantriErr } = await supabase
      .from("santri")
      .select("id, kode, nama_lengkap, halaqoh_kelas, halaqoh_bagian");

    if (fetchSantriErr) {
      return NextResponse.json({ error: fetchSantriErr.message }, { status: 400 });
    }

    const normalizeName = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

    const existingByName = new Map<string, { id: string; kode: string }>();
    const existingByKode = new Map<string, { id: string; kode: string }>();

    (existingSantriData || []).forEach((s) => {
      if (s.nama_lengkap) {
        existingByName.set(normalizeName(s.nama_lengkap), { id: s.id, kode: s.kode });
      }
      if (s.kode) {
        existingByKode.set(s.kode.trim().toLowerCase(), { id: s.id, kode: s.kode });
      }
    });

    const validBagian = new Set(["A", "B", "C", "D", "E", "F"]);
    const payload = rawRows.map((row, index) => {
      const nama_lengkap = String(row["Nama Lengkap"] ?? "").trim();
      const normName = normalizeName(nama_lengkap);

      // Cek apakah santri sudah ada di database berdasarkan Nama atau Kode Santri
      let matched = existingByName.get(normName);

      let explicitKode = String(row["Kode Santri"] ?? "").trim();
      if (explicitKode && existingByKode.has(explicitKode.toLowerCase())) {
        matched = existingByKode.get(explicitKode.toLowerCase());
      }

      let kode = matched ? matched.kode : explicitKode;
      let kode_kamar = String(row["Kode Kamar"] ?? "").trim();

      if (!kode_kamar && row.Kode && !explicitKode) {
        kode_kamar = String(row.Kode).trim();
      }

      if (!kode) {
        // Auto-generate kode unik santri yang aman dari tabrakan
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        kode = `S-${Date.now().toString().slice(-6)}${index + 1}-${randomPart}`;
      }

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

      const item: Record<string, unknown> = {
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

      if (matched?.id) {
        item.id = matched.id;
      }

      return item;
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
