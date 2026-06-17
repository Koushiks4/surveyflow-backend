import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext, supabaseAdmin } from './setup.js';

describe('Project Notes (Activity Feed)', () => {
  let app, surveyorToken, teamLeadToken, ctx;
  let createdNoteId;

  beforeAll(async () => {
    app = await createTestApp();
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    ctx = await getTestContext();
  });

  describe('Project-level notes', () => {
    it('creates a project note', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: authHeaders(surveyorToken),
        payload: {
          projectId: ctx.projects[0].id,
          content: 'Test note from integration test',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().content).toBe('Test note from integration test');
      expect(res.json().user.full_name).toBe('Vikram Singh');
      expect(res.json().task_id).toBeNull();
      createdNoteId = res.json().id;
    });

    it('lists project-level notes (excludes task notes)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/notes/project/${ctx.projects[0].id}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(1);
      expect(res.json().every(n => n.task_id === null)).toBe(true);
      expect(res.json()[0].user).toHaveProperty('full_name');
    });

    it('deletes own note', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/notes/${createdNoteId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(204);
    });

    it('blocks deleting another user\'s note', async () => {
      // Create a note as team lead
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: authHeaders(teamLeadToken),
        payload: {
          projectId: ctx.projects[0].id,
          content: 'Team lead note',
        },
      });
      const noteId = createRes.json().id;

      // Try to delete as surveyor
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/notes/${noteId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toContain('own notes');

      // Cleanup
      await app.inject({
        method: 'DELETE',
        url: `/api/notes/${noteId}`,
        headers: authHeaders(teamLeadToken),
      });
    });
  });

  describe('Task-level notes', () => {
    let taskId;

    beforeAll(async () => {
      const { data: tasks } = await supabaseAdmin
        .from('project_tasks')
        .select('id')
        .eq('project_id', ctx.projects[0].id)
        .limit(1);
      taskId = tasks?.[0]?.id;
    });

    it('creates a task-level note', async () => {
      if (!taskId) return; // skip if no tasks seeded

      const res = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: authHeaders(surveyorToken),
        payload: {
          projectId: ctx.projects[0].id,
          taskId,
          content: 'Task-level test note',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().task_id).toBe(taskId);
    });

    it('lists task-level notes separately', async () => {
      if (!taskId) return;

      const res = await app.inject({
        method: 'GET',
        url: `/api/notes/task/${taskId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(1);
      expect(res.json().every(n => n.task_id === taskId)).toBe(true);
    });
  });

  describe('Validation', () => {
    it('rejects empty content', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: authHeaders(surveyorToken),
        payload: {
          projectId: ctx.projects[0].id,
          content: '',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects missing projectId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: authHeaders(surveyorToken),
        payload: { content: 'No project' },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
