/**
 * Authentication API Tests
 * @route POST /api/auth/login
 * @route POST /api/auth/register
 * @route GET  /api/auth/me
 * @route POST /api/auth/refresh-token
 * @route POST /api/auth/logout
 */

const request = require('supertest');
const { app, getSuperAdminToken } = require('../helpers/setup');
const config = require('../../src/config');

describe('Auth API', () => {
  let authToken;
  let refreshToken;

  // ─── Login ────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login super admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: config.superAdmin.email,
          password: config.superAdmin.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('ujwal880522@gmail.com');
      expect(res.body.user.role).toBe('super_admin');

      // Store for subsequent tests
      authToken = res.body.token;
      refreshToken = res.body.refreshToken;
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: config.superAdmin.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePass123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 with empty body', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── Get Current User ─────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      // Ensure we have a token from the login tests
      if (!authToken) {
        authToken = await getSuperAdminToken();
      }

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('ujwal880522@gmail.com');
      expect(res.body.user.role).toBe('super_admin');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Refresh Token ────────────────────────────────────────────────

  describe('POST /api/auth/refresh-token', () => {
    it('should return new tokens with valid refresh token', async () => {
      if (!refreshToken) {
        // Login fresh
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'ujwal880522@gmail.com',
            password: 'Ujwal@4580',
          });
        refreshToken = loginRes.body.refreshToken;
      }

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should fail without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Logout ───────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      if (!authToken) {
        authToken = await getSuperAdminToken();
      }

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
    });
  });
});
