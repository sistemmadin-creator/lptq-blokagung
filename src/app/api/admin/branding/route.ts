import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { DEFAULT_BRANDING, type AppBrandingConfig } from "@/lib/services/branding-service";
import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";

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
    const hasAdminEdit = userPerms?.user_management === "edit";

    if (!isSuperAdmin && !hasAdminEdit) {
      return NextResponse.json(
        { message: "Anda tidak memiliki wewenang untuk mengubah pengaturan aplikasi." },
        { status: 403 }
      );
    }

    const body: AppBrandingConfig = await request.json();

    // Simpan file gambar jika ada dataURL base64 besar untuk menghemat ukuran JSON database
    let savedLogoUrl = body.logo_url;
    let savedFaviconUrl = body.favicon_url;
    let savedLoginBgUrl = body.login_bg_url;

    const publicImagesDir = path.join(process.cwd(), "public", "images");
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    // 1. Simpan Logo jika format Base64
    if (body.logo_url && body.logo_url.startsWith("data:image/")) {
      try {
        const matches = body.logo_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === "svg+xml" ? "svg" : matches[1];
          const fileName = `custom-logo.${ext}`;
          const filePath = path.join(publicImagesDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));
          savedLogoUrl = `/images/${fileName}?t=${Date.now()}`;
        }
      } catch (e) {
        console.error("Gagal menyimpan file logo fisik:", e);
      }
    }

    // 2. Simpan Favicon jika format Base64
    if (body.favicon_url && body.favicon_url.startsWith("data:image/")) {
      try {
        const matches = body.favicon_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === "x-icon" ? "ico" : matches[1];
          const fileName = `custom-favicon.${ext}`;
          const filePath = path.join(publicImagesDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));
          savedFaviconUrl = `/images/${fileName}?t=${Date.now()}`;
        }
      } catch (e) {
        console.error("Gagal menyimpan file favicon fisik:", e);
      }
    }

    // 3. Simpan Background Login jika format Base64
    if (body.login_bg_url && body.login_bg_url.startsWith("data:image/")) {
      try {
        const matches = body.login_bg_url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const fileName = `custom-login-bg.${ext}`;
          const filePath = path.join(publicImagesDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(matches[2], "base64"));
          savedLoginBgUrl = `/images/${fileName}?t=${Date.now()}`;
        }
      } catch (e) {
        console.error("Gagal menyimpan file background fisik:", e);
      }
    }

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
    return NextResponse.json(
      { message: err?.message || "Terjadi kesalahan saat menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
