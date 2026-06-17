import { describe, it, expect } from 'vitest';
import { createTestApp } from './setup.js';

describe('Auth', () => {
  it('rejects requests without Authorization header', async () => {
    const app = await createTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Missing authorization header');
  });

  it('rejects requests with invalid token', async () => {
    const app = await createTestApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows health check without auth', async () => {
    const app = await createTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
