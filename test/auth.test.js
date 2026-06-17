import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders } from './setup.js';

describe('Auth & RBAC', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('rejects requests without Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Missing authorization header');
  });

  it('rejects requests with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('allows health check without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('allows authenticated request to /api/users/me', async () => {
    const token = await getAuthToken('rajesh@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe('rajesh@sathyananda.com');
    expect(res.json().roles.length).toBeGreaterThan(0);
  });

  it('blocks deactivated user from accessing API', async () => {
    const token = await getAuthToken('ravi@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toContain('deactivated');
  });

  it('blocks surveyor from accessing admin-only endpoints', async () => {
    const token = await getAuthToken('vikram@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(403);
  });

  it('allows admin to access user list', async () => {
    const token = await getAuthToken('priya@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('allows any authenticated user to access roles list', async () => {
    const token = await getAuthToken('vikram@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/roles',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(6);
  });

  it('allows any authenticated user to access user directory', async () => {
    const token = await getAuthToken('vikram@sathyananda.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/users/directory',
      headers: authHeaders(token),
    });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(users.every(u => u.full_name && u.id)).toBe(true);
    expect(users.every(u => u.email === undefined)).toBe(true);
  });
});
