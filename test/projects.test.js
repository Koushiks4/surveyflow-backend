import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext } from './setup.js';

describe('Project Management', () => {
  let app, adminToken, surveyorToken, teamLeadToken, ctx;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    ctx = await getTestContext();
  });

  describe('List & Filter', () => {
    it('lists all projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(4);
    });

    it('searches projects by title', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects?search=BDA',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.length).toBeGreaterThanOrEqual(1);
      expect(res.json().data[0].title).toContain('BDA');
    });

    it('filters projects by status', async () => {
      const pendingStatus = ctx.projectStatuses.find(s => s.name === 'Pending');
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects?statusId=${pendingStatus.id}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.every(p => p.status.name === 'Pending')).toBe(true);
    });

    it('filters projects by client', async () => {
      const clientId = ctx.clients[0].id;
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects?clientId=${clientId}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.every(p => p.client.id === clientId)).toBe(true);
    });
  });

  describe('CRUD', () => {
    let createdProjectId;

    it('creates a project with auto-generated number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: authHeaders(adminToken),
        payload: {
          clientId: ctx.clients[0].id,
          projectTypeId: ctx.projectTypes[0].id,
          title: 'Integration Test Project',
          description: 'Created by integration test',
          startDate: '2026-06-18',
          expectedEndDate: '2026-07-18',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().project_number).toMatch(/^SAT-\d{4}-\d{4}$/);
      expect(res.json().title).toBe('Integration Test Project');
      expect(res.json().client.name).toBeTruthy();
      createdProjectId = res.json().id;
    });

    it('gets project by ID with all relations', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${createdProjectId}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(createdProjectId);
      expect(res.json()).toHaveProperty('client');
      expect(res.json()).toHaveProperty('project_type');
      expect(res.json()).toHaveProperty('status');
      expect(res.json()).toHaveProperty('project_assignments');
      expect(res.json()).toHaveProperty('documents');
    });

    it('updates project status', async () => {
      const inProgressStatus = ctx.projectStatuses.find(s => s.name === 'In Progress');
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/projects/${createdProjectId}`,
        headers: authHeaders(adminToken),
        payload: { statusId: inProgressStatus.id },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status.name).toBe('In Progress');
    });

    it('sets project assignments', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/projects/${createdProjectId}/assignments`,
        headers: authHeaders(adminToken),
        payload: {
          assignments: [
            { userId: ctx.user.id, roleId: ctx.roleMap.super_admin },
          ],
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().project_assignments.length).toBe(1);
    });

    it('rejects duplicate user in assignments', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/projects/${createdProjectId}/assignments`,
        headers: authHeaders(adminToken),
        payload: {
          assignments: [
            { userId: ctx.user.id, roleId: ctx.roleMap.super_admin },
            { userId: ctx.user.id, roleId: ctx.roleMap.admin },
          ],
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain('once per project');
    });

    it('validates required fields on create', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: authHeaders(adminToken),
        payload: { title: 'Missing client' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('RBAC', () => {
    it('allows office staff to create projects', async () => {
      const officeToken = await getAuthToken('anita@sathyananda.com');
      const res = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: authHeaders(officeToken),
        payload: {
          clientId: ctx.clients[0].id,
          title: 'Office Staff Project',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows surveyor to view projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/projects',
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
