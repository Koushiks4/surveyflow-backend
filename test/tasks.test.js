import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext } from './setup.js';

describe('Project Tasks', () => {
  let app, teamLeadToken, surveyorToken, adminToken, ctx;
  let createdTaskId;

  beforeAll(async () => {
    app = await createTestApp();
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    ctx = await getTestContext();
  });

  describe('CRUD', () => {
    it('creates a task (team lead)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeaders(teamLeadToken),
        payload: {
          projectId: ctx.projects[0].id,
          title: 'Test Task - Integration',
          description: 'Created by integration test',
          dueDate: '2026-07-01',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().title).toBe('Test Task - Integration');
      expect(res.json().status).toBe('pending');
      expect(res.json().created_by_user).toHaveProperty('full_name');
      createdTaskId = res.json().id;
    });

    it('creates a task with assignment', async () => {
      const { data: users } = await app.inject({
        method: 'GET',
        url: '/api/users/directory',
        headers: authHeaders(teamLeadToken),
      }).then(r => ({ data: r.json() }));

      const vikram = users.find(u => u.full_name === 'Vikram Singh');

      const res = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeaders(teamLeadToken),
        payload: {
          projectId: ctx.projects[0].id,
          title: 'Assigned Task',
          assignedTo: vikram.id,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().assigned_user.full_name).toBe('Vikram Singh');
    });

    it('lists tasks for a project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/project/${ctx.projects[0].id}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(2);
    });

    it('gets task by ID with notes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${createdTaskId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Test Task - Integration');
      expect(res.json()).toHaveProperty('notes');
    });

    it('updates a task (team lead)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}`,
        headers: authHeaders(teamLeadToken),
        payload: { title: 'Test Task - Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().title).toBe('Test Task - Updated');
    });
  });

  describe('Status Updates', () => {
    it('advances status from pending to in_progress (surveyor)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        headers: authHeaders(surveyorToken),
        payload: { status: 'in_progress' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('in_progress');
      expect(res.json().completed_at).toBeNull();
    });

    it('completes a task and sets completed_at', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        headers: authHeaders(surveyorToken),
        payload: { status: 'completed' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('completed');
      expect(res.json().completed_at).toBeTruthy();
    });

    it('reopens a task and clears completed_at', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        headers: authHeaders(teamLeadToken),
        payload: { status: 'pending' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('pending');
      expect(res.json().completed_at).toBeNull();
    });

    it('rejects invalid status value', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        headers: authHeaders(surveyorToken),
        payload: { status: 'invalid_status' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('RBAC', () => {
    it('blocks surveyor from creating tasks', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeaders(surveyorToken),
        payload: {
          projectId: ctx.projects[0].id,
          title: 'Should Fail',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('blocks surveyor from deleting tasks', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${createdTaskId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows surveyor to update task status', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${createdTaskId}/status`,
        headers: authHeaders(surveyorToken),
        payload: { status: 'in_progress' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('allows team lead to delete tasks', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${createdTaskId}`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(204);
    });
  });
});
