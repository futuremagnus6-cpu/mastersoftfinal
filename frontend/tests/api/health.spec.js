/**
 * Health Check API Tests
 * @file tests/api/health.spec.js
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/health', () => {
  test('should return 200 with server info', async ({ request }) => {
    const res = await request.get('/api/health');
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toContain('Future Magnus');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('database');
    expect(body.database).toHaveProperty('status');
    expect(body.database).toHaveProperty('label');
    expect(body).toHaveProperty('timestamp');
  });

  test('should have a connected database', async ({ request }) => {
    const res = await request.get('/api/health');
    const body = await res.json();

    expect(body.database.status).toBe(1);
    expect(body.database.label).toBe('connected');
  });

  test('should return 404 for unknown route', async ({ request }) => {
    const res = await request.get('/api/nonexistent-route-12345');
    expect(res.status()).toBe(404);
  });
});
