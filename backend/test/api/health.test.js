/**
 * Health Check API Tests
 * @route GET /api/health
 */

const request = require('supertest');
const { app } = require('../helpers/setup');

describe('GET /api/health', () => {
  it('should return 200 with server info', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Future Magnus');
    expect(res.body).toHaveProperty('environment', 'test');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status');
    expect(res.body.database).toHaveProperty('label');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('should have a connected database', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.database.status).toBe(1); // 1 = connected
    expect(res.body.database.label).toBe('connected');
  });
});
