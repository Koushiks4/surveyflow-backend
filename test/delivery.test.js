import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext, supabaseAdmin } from './setup.js';

function makeMultipartPayload(filename, content) {
  const boundary = '----FormBoundary' + Date.now();
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: application/octet-stream',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

describe('Delivery Module', () => {
  let app, adminToken, teamLeadToken, surveyorToken, ctx;
  let deliverableId;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    ctx = await getTestContext();
  });

  describe('Deliverables', () => {
    it('uploads a deliverable', async () => {
      const { body, contentType } = makeMultipartPayload('final-report.pdf', 'report content');
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/deliverables`,
        headers: { ...authHeaders(teamLeadToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().file_name).toBe('final-report.pdf');
      expect(res.json().uploader).toHaveProperty('full_name');
      deliverableId = res.json().id;
    });

    it('lists deliverables for a project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/deliverables`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(1);
    });

    it('gets a download URL for a deliverable', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/deliverables/${deliverableId}/url`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().url).toContain('http');
    });

    it('allows surveyor to list deliverables', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/deliverables`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(200);
    });

    it('blocks surveyor from uploading deliverables', async () => {
      const { body, contentType } = makeMultipartPayload('blocked.pdf', 'content');
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/deliverables`,
        headers: { ...authHeaders(surveyorToken), 'content-type': contentType },
        payload: body,
      });
      expect(res.statusCode).toBe(403);
    });

    it('blocks surveyor from deleting deliverables', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/delivery/deliverables/${deliverableId}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows team lead to delete deliverables', async () => {
      const { body, contentType } = makeMultipartPayload('to-delete.pdf', 'tmp');
      const uploadRes = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/deliverables`,
        headers: { ...authHeaders(teamLeadToken), 'content-type': contentType },
        payload: body,
      });
      const tmpId = uploadRes.json().id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/delivery/deliverables/${tmpId}`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('Closure Checklist Config', () => {
    it('lists checklist items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(4);
    });

    it('creates a checklist item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(adminToken),
        payload: { title: 'Test checklist item' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().title).toBe('Test checklist item');
    });

    it('rejects duplicate checklist item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(adminToken),
        payload: { title: 'Test checklist item' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('deletes a checklist item', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(adminToken),
      });
      const testItem = listRes.json().find(i => i.title === 'Test checklist item');

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/delivery/checklist-items/${testItem.id}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(204);
    });

    it('blocks team lead from creating checklist items', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(teamLeadToken),
        payload: { title: 'Should fail' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Project Closure Checks', () => {
    let checklistItemId;

    beforeAll(async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/delivery/checklist-items',
        headers: authHeaders(adminToken),
      });
      checklistItemId = res.json()[0].id;
    });

    it('returns project checklist with all items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(4);
      expect(res.json()[0]).toHaveProperty('title');
      expect(res.json()[0]).toHaveProperty('checked');
    });

    it('toggles a checklist item to checked', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist/${checklistItemId}/toggle`,
        headers: authHeaders(teamLeadToken),
        payload: { checked: true },
      });
      expect(res.statusCode).toBe(200);

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist`,
        headers: authHeaders(teamLeadToken),
      });
      const item = listRes.json().find(i => i.id === checklistItemId);
      expect(item.checked).toBe(true);
      expect(item.checked_by).toHaveProperty('full_name');
    });

    it('toggles a checklist item back to unchecked', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist/${checklistItemId}/toggle`,
        headers: authHeaders(teamLeadToken),
        payload: { checked: false },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist`,
        headers: authHeaders(teamLeadToken),
      });
      const item = listRes.json().find(i => i.id === checklistItemId);
      expect(item.checked).toBe(false);
    });

    it('blocks surveyor from toggling checklist', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/checklist/${checklistItemId}/toggle`,
        headers: authHeaders(surveyorToken),
        payload: { checked: true },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Delivery Confirmation', () => {
    it('returns unconfirmed status initially', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/status`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().confirmed).toBe(false);
    });

    it('confirms delivery with notes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[0].id}/confirm`,
        headers: authHeaders(teamLeadToken),
        payload: { notes: 'Client received hard copy and soft copy' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('shows confirmed status after confirmation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/delivery/project/${ctx.projects[0].id}/status`,
        headers: authHeaders(teamLeadToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().confirmed).toBe(true);
      expect(res.json().confirmed_at).toBeTruthy();
      expect(res.json().notes).toBe('Client received hard copy and soft copy');
    });

    it('blocks surveyor from confirming delivery', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/delivery/project/${ctx.projects[1].id}/confirm`,
        headers: authHeaders(surveyorToken),
        payload: {},
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
