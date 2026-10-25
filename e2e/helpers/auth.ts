import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, '.auth-cache.json');

export async function loginAsAdmin(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    // 1. Gunakan cache file antar-worker jika masih valid (< 20 menit)
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const stat = fs.statSync(CACHE_FILE);
        if (Date.now() - stat.mtimeMs < 20 * 60 * 1000) {
          const cookies = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
          if (Array.isArray(cookies) && cookies.length > 0) {
            // Periksa apakah token di dalamnya belum kedaluwarsa
            const authCookie = cookies.find((c: any) => c.name.includes('auth-token'));
            let isExpired = false;
            if (authCookie?.value) {
              try {
                const parsed = JSON.parse(authCookie.value);
                if (parsed.expires_at && parsed.expires_at * 1000 < Date.now() + 60000) {
                  isExpired = true;
                }
              } catch {}
            }
            if (!isExpired) {
              await page.context().addCookies(
                cookies.map((c: any) => ({
                  name: c.name,
                  value: c.value,
                  url: 'http://localhost:3005',
                }))
              );
              return;
            }
          }
        }
      } catch (e) {
        // Abaikan dan coba lagi
      }
    }

    // 2. Generate sesi baru jika cache belum tersedia
    try {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yiwqgdqizdzsgikjlwoq.supabase.co';
      const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd3FnZHFpemR6c2dpa2psd29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTA4MjEsImV4cCI6MjEwNzk4NjgyMX0.Hnhpp6eSlsqz24E1wKgu2DdHPnXtI8NZZP3ORY7YK6U';
      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd3FnZHFpemR6c2dpa2psd29xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQxMDgyMSwiZXhwIjoyMTA3OTg2ODIxfQ.aF_tNdSjyF-Dg92HXYblZ9PmO2U0qtWgBmRTYkJnvpA';

      const admin = createClient(supabaseUrl, serviceRoleKey);
      const client = createClient(supabaseUrl, supabaseAnonKey);

      const link = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: 'admin@blokagung.net',
      });

      if (!link.data?.properties?.hashed_token) {
        throw new Error('Gagal membuat magic link autentikasi pengujian');
      }

      const otpRes = await client.auth.verifyOtp({
        token_hash: link.data.properties.hashed_token,
        type: 'magiclink',
      });

      if (!otpRes.data?.session) {
        throw new Error('Gagal memverifikasi OTP sesi pengujian');
      }

      const cookieJar: { name: string; value: string }[] = [];
      const ssr = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get: () => '',
          set: (name: string, value: string) => {
            cookieJar.push({ name, value });
          },
          remove: () => {},
        },
      });

      await ssr.auth.setSession(otpRes.data.session);

      try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cookieJar, null, 2), 'utf8');
      } catch (e) {}

      await page.context().addCookies(
        cookieJar.map((c) => ({
          name: c.name,
          value: c.value,
          url: 'http://localhost:3005',
        }))
      );
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
