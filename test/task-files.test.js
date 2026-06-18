import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext, supabaseAdmin } from './setup.js';

function makeMultipartPayload(filename, content, contentType = 'application/octet-stream') {
  const boundary = '----FormBoundary' + Date.now() + Math.random().toString(36).slice(2);
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe('Task Files (Version Tracking)', () => {
  let app, adminToken, teamLeadToken, surveyorToken, officeToken, ctx;
  let testTaskId, taskOnProject2Id;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    officeToken = await getAuthToken('anita@sathyananda.com');
    ctx = await getTestContext();

    // Create a fresh task specifically for file tests to avoid leftover state
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: authHeaders(teamLeadToken),
      payload: { projectId: ctx.projects[0].id, title: 'File Upload Test Task' },
    });
    testTaskId = taskRes.json().id;

    const { data: tasks2 } = await supabaseAdmin
      .from('project_tasks')
      .select('id')
      .eq('project_id', ctx.projects[1].id)
      .limit(1);
    taskOnProject2Id = tasks2?.[0]?.id;
  });

  describe('Upload & Versioning', () => {
    let v1Id, v2Id, v3Id, v4Id;

    it('uploads first file as version 1', async () => {
      const { body, contentType } = makeMultipartPayload('site-plan.dwg', 'dwg binary content v1');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(surveyorToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      const file = res.json();
      expect(file.version).toBe(1);
      expect(file.file_name).toBe('site-plan.dwg');
      expect(file.file_size).toBeGreaterThan(0);
      expect(file.uploader.full_name).toBe('Vikram Singh');
      v1Id = file.id;
    });

    it('uploads same filename again as version 2', async () => {
      const { body, contentType } = makeMultipartPayload('site-plan.dwg', 'dwg binary content v2 with more data');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(surveyorToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().version).toBe(2);
      expect(res.json().file_name).toBe('site-plan.dwg');
      v2Id = res.json().id;
    });

    it('uploads same filename as version 3 by different user', async () => {
      const { body, contentType } = makeMultipartPayload('site-plan.dwg', 'final version content');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(teamLeadToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().version).toBe(3);
      expect(res.json().uploader.full_name).toBe('Suresh Reddy');
      v3Id = res.json().id;
    });

    it('uploads a different file — starts at version 1', async () => {
      const { body, contentType } = makeMultipartPayload('report.pdf', 'pdf content', 'application/pdf');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(officeToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().version).toBe(1);
      expect(res.json().file_name).toBe('report.pdf');
      expect(res.json().file_type).toBe('application/pdf');
      v4Id = res.json().id;
    });

    it('lists all files grouped by name then version desc', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      const files = res.json();
      expect(files.length).toBe(4);
      const reportFiles = files.filter((f) => f.file_name === 'report.pdf');
      const planFiles = files.filter((f) => f.file_name === 'site-plan.dwg');
      expect(reportFiles.length).toBe(1);
      expect(planFiles.length).toBe(3);
      expect(planFiles[0].version).toBe(3);
      expect(planFiles[1].version).toBe(2);
      expect(planFiles[2].version).toBe(1);
    });

    it('includes uploader info in listing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(surveyorToken),
      });
      const files = res.json();
      expect(files.every((f) => f.uploader && f.uploader.full_name)).toBe(true);
    });

    it('returns signed download URL for v1', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/files/${v1Id}/url`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().url).toContain('http');
    });

    it('returns signed download URL for different file (report.pdf vs site-plan.dwg)', async () => {
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/tasks/files/${v1Id}/url`,
        headers: authHeaders(surveyorToken),
      });
      const res4 = await app.inject({
        method: 'GET',
        url: `/api/tasks/files/${v4Id}/url`,
        headers: authHeaders(surveyorToken),
      });
      expect(res1.statusCode).toBe(200);
      expect(res4.statusCode).toBe(200);
      expect(res1.json().url).not.toBe(res4.json().url);
    });
  });

  describe('Empty & Isolation', () => {
    it('returns empty array for task with no files', async () => {
      const taskRes = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeaders(teamLeadToken),
        payload: { projectId: ctx.projects[0].id, title: 'No files task' },
      });
      const emptyTaskId = taskRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${emptyTaskId}/files`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);

      await app.inject({ method: 'DELETE', url: `/api/tasks/${emptyTaskId}`, headers: authHeaders(teamLeadToken) });
    });

    it('does not leak files from other tasks', async () => {
      if (!taskOnProject2Id) return;
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${taskOnProject2Id}/files`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBe(0);
    });
  });

  describe('RBAC', () => {
    it('allows surveyor (assigned) to upload', async () => {
      const { body, contentType } = makeMultipartPayload('surveyor-rbac.txt', 'test');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(surveyorToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows office staff (assigned) to upload', async () => {
      const { body, contentType } = makeMultipartPayload('office-rbac.docx', 'test');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(officeToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows admin to upload', async () => {
      const { body, contentType } = makeMultipartPayload('admin-rbac.xlsx', 'test');
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: { ...authHeaders(adminToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
    });

    it('allows any authenticated user to list files', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(officeToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it('blocks surveyor from deleting files', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(surveyorToken),
      });
      const fileId = listRes.json()[0].id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/files/${fileId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows team lead to delete files', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(teamLeadToken),
      });
      const fileId = listRes.json()[0].id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/files/${fileId}`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(204);
    });

    it('allows admin to delete files', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(adminToken),
      });
      const fileId = listRes.json()[0].id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/files/${fileId}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Edge Cases', () => {
    it('rejects upload without a file attached', async () => {
      const boundary = '----FormBoundary' + Date.now();
      const body = `--${boundary}--`;
      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${testTaskId}/files`,
        headers: {
          ...authHeaders(surveyorToken),
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for download of non-existent file ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks/files/00000000-0000-0000-0000-000000000000/url',
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when deleting non-existent file', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/tasks/files/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(404);
    });

    it('versions are sequential per filename', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${testTaskId}/files`,
        headers: authHeaders(surveyorToken),
      });
      const files = res.json();
      const grouped = new Map();
      for (const f of files) {
        if (!grouped.has(f.file_name)) grouped.set(f.file_name, []);
        grouped.get(f.file_name).push(f.version);
      }
      for (const [, versions] of grouped) {
        for (let i = 0; i < versions.length - 1; i++) {
          expect(versions[i]).toBeGreaterThan(versions[i + 1]);
        }
      }
    });
  });
});
