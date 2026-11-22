import {
  createServerSupabase,
  createServiceRoleClient,
  verifyCsrfOrigin,
} from "@/lib/supabase/server";
import { DEFAULT_BRANDING, type AppBrandingConfig } from "@/lib/services/branding-service";
import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

const SAFE_RELATIVE_IMAGE_REGEX = /^\/images\/[a-zA-Z0-9._-]+(\?t=\d+)?$/;
const ALLOWED_DATA_IMAGE_REGEX =
  /^data:image\/(png|jpeg|jpg|webp|x-icon|vnd\.microsoft\.icon);base64,([A-Za-z0-9+/=]+)$/;

class BrandingValidationError extends Error {}

function hasValidImageMagicBytes(mimeSubtype: string, buf: Buffer): boolean {
  if (mimeSubtype === "png") {
    return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (mimeSubtype === "jpeg" || mimeSubtype === "jpg") {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeSubtype === "webp") {
    return (
      buf.length >= 12 &&
      buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (mimeSubtype === "x-icon" || mimeSubtype === "vnd.microsoft.icon") {
    return buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00;
  }
  return false;
}

function resolveExtension(mimeSubtype: string): string {
  if (mimeSubtype === "jpeg") return "jpg";
  if (mimeSubtype === "x-icon" || mimeSubtype === "vnd.microsoft.icon") return "ico";
  return mimeSubtype;
}

function processBrandingImageInput(
  rawUrl: string | null | undefined,
  baseFileName: string,
  publicImagesDir: string
): string | null {
  if (!rawUrl || !rawUrl.trim()) {
    return null;
  }

  const trimmed = rawUrl.trim();

  if (trimmed.startsWith("data:")) {
    const matches = trimmed.match(ALLOWED_DATA_IMAGE_REGEX);
    if (!matches || !matches[1] || !matches[2]) {
      throw new BrandingValidationError(
        "Format gambar tidak diizinkan. Hanya file raster PNG, JPG, WEBP, atau ICO yang diperbolehkan."
      );
    }

    const mimeSubtype = matches[1].toLowerCase();
    const buf = Buffer.from(matches[2], "base64");
    if (!hasValidImageMagicBytes(mimeSubtype, buf)) {
      throw new BrandingValidationError("Isi berkas gambar tidak valid atau rusak.");
    }

    const ext = resolveExtension(mimeSubtype);
    const fileName = `${baseFileName}.${ext}`;
    const filePath = path.join(publicImagesDir, fileName);

    try {
      if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
      }
      fs.writeFileSync(filePath, buf);
      return `/images/${fileName}?t=${Date.now()}`;
    } catch {
      // Fallback aman untuk filesystem read-only (serverless) menggunakan data URL raster yang tervalidasi
      return trimmed;
    }
  }

  if (!SAFE_RELATIVE_IMAGE_REGEX.test(trimmed)) {
    throw new BrandingValidationError("URL gambar harus berupa path lokal /images/ yang aman.");
  }

  return trimmed;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "APP_BRANDING")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return NextResponse.json({ config: { ...DEFAULT_BRANDING, ...data.value } });
    }
    return NextResponse.json({ config: DEFAULT_BRANDING });
  } catch (err: any) {
    return NextResponse.json({ config: DEFAULT_BRANDING, error: err?.message });
  }
}

export async function POST(request: NextRequest) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.valid) {
    return NextResponse.json({ message: csrf.error }, { status: 403 });
  }

  try {
    const supabaseUser = createServerSupabase();
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Sesi telah berakhir. Silakan masuk kembali." },
        { status: 401 }
      );
    }

    const adminClient = createServiceRoleClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: permSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "USER_PERMISSIONS")
      .maybeSingle();

    const userPerms = permSetting?.value?.[user.id]?.permissions;
    const isSuperAdmin = profile?.role === "admin";
    const isPengurusWithEdit =
      profile?.role === "pengurus" && userPerms?.user_management === "edit";

    if (!isSuperAdmin && !isPengurusWithEdit) {
      return NextResponse.json(
        { message: "Anda tidak memiliki wewenang untuk mengubah pengaturan aplikasi." },
        { status: 403 }
      );
    }

    const body: AppBrandingConfig = await request.json();
    const publicImagesDir = path.join(process.cwd(), "public", "images");

    const savedLogoUrl = processBrandingImageInput(body.logo_url, "custom-logo", publicImagesDir);
    const savedFaviconUrl = processBrandingImageInput(
      body.favicon_url,
      "custom-favicon",
      publicImagesDir
    );
    const savedLoginBgUrl = processBrandingImageInput(
      body.login_bg_url,
      "custom-login-bg",
      publicImagesDir
    );

    const finalConfig: AppBrandingConfig = {
      app_name: body.app_name?.trim() || DEFAULT_BRANDING.app_name,
      app_subtitle: body.app_subtitle?.trim() || DEFAULT_BRANDING.app_subtitle,
      logo_url: savedLogoUrl,
      favicon_url: savedFaviconUrl,
      login_bg_url: savedLoginBgUrl || DEFAULT_BRANDING.login_bg_url,
      login_bg_overlay: Number(body.login_bg_overlay) || DEFAULT_BRANDING.login_bg_overlay,
      login_card_opacity:
        body.login_card_opacity !== undefined
          ? Number(body.login_card_opacity)
          : DEFAULT_BRANDING.login_card_opacity,
      kkm_khotmil: Number(body.kkm_khotmil) || DEFAULT_BRANDING.kkm_khotmil,
      target_setoran: Number(body.target_setoran) || DEFAULT_BRANDING.target_setoran,
      active_year: Number(body.active_year) || DEFAULT_BRANDING.active_year,
      petunjuk_penguji_ljk:
        body.petunjuk_penguji_ljk !== undefined
          ? body.petunjuk_penguji_ljk.trim()
          : DEFAULT_BRANDING.petunjuk_penguji_ljk,
      bobot_kesalahan:
        body.bobot_kesalahan !== undefined
          ? Number(body.bobot_kesalahan)
          : DEFAULT_BRANDING.bobot_kesalahan,
      bobot_halaman:
        body.bobot_halaman !== undefined
          ? Number(body.bobot_halaman)
          : DEFAULT_BRANDING.bobot_halaman,
      updated_at: new Date().toISOString(),
    };

    const { error } = await adminClient.from("app_settings").upsert(
      {
        key: "APP_BRANDING",
        value: finalConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Pengaturan tampilan dan aplikasi berhasil disimpan.",
      config: finalConfig,
    });
  } catch (err: any) {
    if (err instanceof BrandingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: err?.message || "Terjadi kesalahan saat menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
