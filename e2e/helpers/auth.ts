import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, '.auth-cache.json');

function loadLocalEnv() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

export function getTestSupabaseEnv() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error(
      'Environment Supabase untuk E2E (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) belum tersedia.'
    );
  }
  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

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
      const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getTestSupabaseEnv();

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
          getAll() {
            return [];
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              const existingIdx = cookieJar.findIndex((c) => c.name === name);
              if (existingIdx >= 0) {
                cookieJar[existingIdx].value = value;
              } else {
                cookieJar.push({ name, value });
              }
            }
          },
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
