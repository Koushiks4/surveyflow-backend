import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders } from './setup.js';

describe('Dashboard', () => {
  let app, adminToken, surveyorToken;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
  });

  describe('Stats', () => {
    it('returns dashboard stats for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const stats = res.json();
      expect(stats).toHaveProperty('projects');
      expect(stats).toHaveProperty('clients');
      expect(stats).toHaveProperty('statuses');
      expect(stats.projects.total).toBeGreaterThanOrEqual(4);
      expect(stats.clients.total).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(stats.statuses)).toBe(true);
      expect(stats.statuses.length).toBeGreaterThanOrEqual(3);
      expect(stats.statuses[0]).toHaveProperty('count');
    });

    it('returns filtered stats for non-admin (only assigned projects)', async () => {
      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: authHeaders(adminToken),
      });

      const surveyorRes = await app.inject({
        method: 'GET',
        url: '/api/dashboard/stats',
        headers: authHeaders(surveyorToken),
      });

      expect(surveyorRes.statusCode).toBe(200);
      expect(surveyorRes.json().projects.total).toBeLessThanOrEqual(adminRes.json().projects.total);
    });
  });

  describe('Recent Projects', () => {
    it('returns recent projects for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/recent-projects',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(1);
      expect(res.json()[0]).toHaveProperty('project_number');
      expect(res.json()[0]).toHaveProperty('client');
      expect(res.json()[0]).toHaveProperty('status');
    });

    it('returns only assigned projects for surveyor', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/recent-projects',
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      // Vikram is assigned to projects 0, 2, 3
      expect(res.json().length).toBeGreaterThanOrEqual(1);
    });

    it('respects limit parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/recent-projects?limit=2',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeLessThanOrEqual(2);
    });
  });
});
