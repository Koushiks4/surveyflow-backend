import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders } from './setup.js';

describe('Config Management', () => {
  let app, adminToken, surveyorToken;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
  });

  describe('Organization', () => {
    it('returns organization details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/config/organization',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Sathyananda Surveys');
      expect(res.json().project_id_prefix).toBe('SAT');
    });

    it('updates organization settings', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/config/organization',
        headers: authHeaders(adminToken),
        payload: { projectIdPrefix: 'SAT' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().project_id_prefix).toBe('SAT');
    });

    it('blocks non-admin from updating organization', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/config/organization',
        headers: authHeaders(surveyorToken),
        payload: { name: 'Hacked' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Project Types', () => {
    it('lists project types', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/config/project-types',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(3);
    });

    it('creates a project type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/project-types',
        headers: authHeaders(adminToken),
        payload: { name: 'Test Type' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().name).toBe('Test Type');
    });

    it('rejects duplicate project type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/project-types',
        headers: authHeaders(adminToken),
        payload: { name: 'Test Type' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('deletes a project type not in use', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/config/project-types',
        headers: authHeaders(adminToken),
      });
      const testType = listRes.json().find(t => t.name === 'Test Type');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/config/project-types/${testType.id}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(204);
    });

    it('blocks deletion of project type in use', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/config/project-types',
        headers: authHeaders(adminToken),
      });
      const landSurvey = listRes.json().find(t => t.name === 'Land Survey');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/config/project-types/${landSurvey.id}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toContain('active project');
    });
  });

  describe('Project Statuses', () => {
    it('lists project statuses', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/config/project-statuses',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(3);
    });

    it('creates a project status with color', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/config/project-statuses',
        headers: authHeaders(adminToken),
        payload: { name: 'Test Status', color: '#FF0000' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().name).toBe('Test Status');

      // cleanup
      await app.inject({
        method: 'DELETE',
        url: `/api/config/project-statuses/${res.json().id}`,
        headers: authHeaders(adminToken),
      });
    });
  });

  describe('Expense Categories', () => {
    it('lists expense categories', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/config/expense-categories',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(4);
    });
  });
});
