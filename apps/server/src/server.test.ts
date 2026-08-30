import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { buildServer } from './server';
import { FastifyInstance } from 'fastify';

describe('Fastify Server Health & Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer(true);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds with status ok on /health without revealing stack or engine details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    expect(body.engine).toBeUndefined();
  });

  it('calculates preview targets without auth on /api/users/preview-targets', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/users/preview-targets',
      payload: {
        sex: 'male',
        age: 28,
        heightCm: 175,
        weightKg: 75,
        activityLevel: 'moderately_active',
        goal: 'maintain',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.targets).toBeDefined();
    expect(body.targets.calories).toBeGreaterThan(1500);
    expect(body.targets.proteinG).toBe(150); // 75kg * 2
  });

  it('rejects protected route without JWT token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/meals/daily',
    });

    expect(response.statusCode).toBe(401);
  });

  it('does not expose /docs when NODE_ENV is production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prodApp = await buildServer(true);

    const response = await prodApp.inject({
      method: 'GET',
      url: '/docs',
    });

    // In production, fastify router does not register /docs, returning 404
    expect(response.statusCode).toBe(404);
    await prodApp.close();
    process.env.NODE_ENV = originalEnv;
  });

  it('checks auth status on /api/auth/status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/status',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(typeof body.hasAccount).toBe('boolean');
  });
});
