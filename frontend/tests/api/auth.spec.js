/**
 * Authentication API Tests
 * @file tests/api/auth.spec.js
 * 
 * Tests: POST /api/auth/login, GET /api/auth/me, POST /api/auth/refresh-token, POST /api/auth/logout
 */

import { test, expect } from '@playwright/test';
import config from '../../playwright.config.js';

const SUPER_ADMIN_EMAIL = 'ujwal880522@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Ujwal@4580';

test.describe('Auth API', () => {
  let authToken;
  let refreshToken;

  // ─── Login ────────────────────────────────────────────────────────

  test.describe('POST /api/auth/login', () => {
    test('should login super admin with valid credentials', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('refreshToken');
      expect(body.user.email).toBe(SUPER_ADMIN_EMAIL);
      expect(body.user.role).toBe('super_admin');

      // Store for subsequent tests
      authToken = body.token;
      refreshToken = body.refreshToken;
    });

    test('should fail with wrong password', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: 'wrongpassword',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should fail with non-existent email', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: {
          email: 'nonexistent@test.com',
          password: 'SomePass123',
        },
      });
      const body = await res.json();

      expect(res.status()).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should return 400 with empty body', async ({ request }) => {
      const res = await request.post('/api/auth/login', {
        data: {},
      });

      expect(res.status()).toBe(400);
    });
  });

  // ─── Get Current User ─────────────────────────────────────────────

  test.describe('GET /api/auth/me', () => {
    test('should return current user when authenticated', async ({ request }) => {
      // Login first to get a fresh token
      const loginRes = await request.post('/api/auth/login', {
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.token;

      const res = await request.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.user.email).toBe(SUPER_ADMIN_EMAIL);
      expect(body.user.role).toBe('super_admin');
    });

    test('should fail without token', async ({ request }) => {
      const res = await request.get('/api/auth/me');
      const body = await res.json();

      expect(res.status()).toBe(401);
      expect(body.success).toBe(false);
    });

    test('should fail with invalid token', async ({ request }) => {
      const res = await request.get('/api/auth/me', {
        headers: { Authorization: 'Bearer invalidtoken123' },
      });
      const body = await res.json();

      expect(res.status()).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  // ─── Refresh Token ────────────────────────────────────────────────

  test.describe('POST /api/auth/refresh-token', () => {
    test('should return new tokens with valid refresh token', async ({ request }) => {
      // Login fresh
      const loginRes = await request.post('/api/auth/login', {
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        },
      });
      const loginBody = await loginRes.json();
      const refreshTok = loginBody.refreshToken;

      const res = await request.post('/api/auth/refresh-token', {
        data: { refreshToken: refreshTok },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('refreshToken');
    });

    test('should fail without refresh token', async ({ request }) => {
      const res = await request.post('/api/auth/refresh-token', {
        data: {},
      });
      const body = await res.json();

      expect(res.status()).toBe(400);
      expect(body.success).toBe(false);
    });

    test('should fail with invalid refresh token', async ({ request }) => {
      const res = await request.post('/api/auth/refresh-token', {
        data: { refreshToken: 'invalid' },
      });
      const body = await res.json();

      expect(res.status()).toBe(401);
      expect(body.success).toBe(false);
    });
  });

  // ─── Logout ───────────────────────────────────────────────────────

  test.describe('POST /api/auth/logout', () => {
    test('should logout successfully', async ({ request }) => {
      // Login first
      const loginRes = await request.post('/api/auth/login', {
        data: {
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        },
      });
      const loginBody = await loginRes.json();
      const token = loginBody.token;

      const res = await request.post('/api/auth/logout', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();

      expect(res.status()).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logged out');
    });
  });
});
