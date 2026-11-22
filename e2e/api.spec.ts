import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { getTestSupabaseEnv, loginAsAdmin } from './helpers/auth';

test.describe('API Endpoint Contract & Security Testing', () => {
  test('POST /api/auth/login menolak permintaan tanpa nama pengguna atau kata sandi (400)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        username: '',
        password: '',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('wajib diisi');
  });

  test('POST /api/auth/login menolak format JSON yang tidak valid (400)', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        username: 12345,
        password: null,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('wajib diisi');
  });

  test('POST /api/auth/login mengembalikan status 401 saat kredensial tidak cocok', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: {
        username: 'user_dummy_nonexistent',
        password: 'salah_password_999',
      },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toContain('tidak valid');
  });

  test('GET /api/admin/users tanpa sesi login ditolak dengan status 401', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect([401, 403, 307]).toContain(res.status());
  });

  test('HTTP Security Headers terpasang lengkap pada respons halaman', async ({ request }) => {
    const res = await request.get('/login');
    expect(res.status()).toBe(200);
    const headers = res.headers();

    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  test('Proteksi Auth & SSRF pada /api/waha/* menolak permintaan tanpa sesi login (401)', async ({ request }) => {
    const resSession = await request.get('/api/waha/sessions/default');
    expect(resSession.status()).toBe(401);

    const resSsrf = await request.get('/api/waha/test?targetUrl=http://169.254.169.254');
    expect(resSsrf.status()).toBe(401);
  });

  test('Proteksi CSRF menolak permintaan mutasi lintas-origin (403)', async ({ request }) => {
    const resUsers = await request.post('/api/admin/users', {
      headers: {
        Origin: 'https://evil.example.com',
      },
      data: { username: 'attacker', nama: 'Attacker', password: 'password123' },
    });
    expect(resUsers.status()).toBe(403);

    const resImport = await request.post('/api/import/santri', {
      headers: {
        Origin: 'https://evil.example.com',
      },
      data: { rows: [] },
    });
    expect(resImport.status()).toBe(403);
  });

  test('Proteksi Brute-Force Login tetap mengunci username meski X-Forwarded-For dipalsukan (429)', async ({ request }) => {
    const testUser = `bruteforce_check_${Date.now()}`;

    for (let i = 1; i <= 5; i++) {
      const res = await request.post('/api/auth/login', {
        headers: {
          'X-Forwarded-For': `10.0.0.${i}`,
        },
        data: {
          username: testUser,
          password: 'WrongPassword123!',
        },
      });
      expect(res.status()).toBe(401);
    }

    const lockedRes = await request.post('/api/auth/login', {
      headers: {
        'X-Forwarded-For': '10.0.0.99',
      },
      data: {
        username: testUser,
        password: 'WrongPassword123!',
      },
    });
    expect(lockedRes.status()).toBe(429);
    const body = await lockedRes.json();
    expect(body.message).toContain('dikunci');
  });

  test('RLS public.app_settings menolak akses baca/tulis anon terhadap USER_PERMISSIONS', async () => {
    const { supabaseUrl, supabaseAnonKey } = getTestSupabaseEnv();
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: readData } = await anonClient
      .from('app_settings')
      .select('key')
      .eq('key', 'USER_PERMISSIONS')
      .maybeSingle();
    expect(readData).toBeNull();

    const { error: writeErr } = await anonClient
      .from('app_settings')
      .upsert({ key: 'USER_PERMISSIONS', value: { hacked: true } });
    expect(writeErr).not.toBeNull();
  });

  test('Pelindung Sandi Pasaran/Bocor (HaveIBeenPwned) menolak pembuatan pengguna dengan password bocor seperti password123 (400)', async ({ page }) => {
    await loginAsAdmin(page);
    const res = await page.request.post('/api/admin/users', {
      data: {
        username: `test_leak_${Date.now()}`,
        nama: 'Pengguna Sandi Bocor',
        password: 'password123',
        role: 'viewer',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('pernah bocor');
  });
});
