import { test, expect } from '@playwright/test';

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
});
