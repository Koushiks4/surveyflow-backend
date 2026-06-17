import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext, supabaseAdmin } from './setup.js';

describe('Attendance (GPS Check-in/Check-out)', () => {
  let app, surveyorToken, teamLeadToken, ctx;

  beforeAll(async () => {
    app = await createTestApp();
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    ctx = await getTestContext();

    // Clear any open check-ins for test user
    await supabaseAdmin
      .from('attendance_logs')
      .update({ check_out_at: new Date().toISOString(), check_out_lat: 0, check_out_lng: 0 })
      .is('check_out_at', null);
  });

  it('returns null when no active check-in', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/attendance/active',
      headers: authHeaders(surveyorToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });

  it('checks in to a project with GPS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: authHeaders(surveyorToken),
      payload: {
        projectId: ctx.projects[0].id,
        lat: 12.9716,
        lng: 77.5946,
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().check_in_lat).toBe(12.9716);
    expect(res.json().check_in_lng).toBe(77.5946);
    expect(res.json().check_out_at).toBeNull();
  });

  it('returns active check-in', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/attendance/active',
      headers: authHeaders(surveyorToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).not.toBeNull();
    expect(res.json().project.project_number).toBeTruthy();
  });

  it('prevents double check-in', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: authHeaders(surveyorToken),
      payload: {
        projectId: ctx.projects[1].id,
        lat: 12.97,
        lng: 77.75,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('already have an active check-in');
  });

  it('checks out with GPS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/attendance/check-out',
      headers: authHeaders(surveyorToken),
      payload: {
        lat: 12.9720,
        lng: 77.5950,
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().check_out_at).toBeTruthy();
    expect(res.json().check_out_lat).toBe(12.972);
  });

  it('returns null after check-out', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/attendance/active',
      headers: authHeaders(surveyorToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();
  });

  it('prevents check-out without active check-in', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/attendance/check-out',
      headers: authHeaders(surveyorToken),
      payload: { lat: 12.97, lng: 77.59 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('No active check-in');
  });

  it('lists attendance logs for a project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/attendance/project/${ctx.projects[0].id}`,
      headers: authHeaders(teamLeadToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    expect(res.json().data[0].user).toHaveProperty('full_name');
  });

  it('validates required fields on check-in', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/attendance/check-in',
      headers: authHeaders(surveyorToken),
      payload: { projectId: ctx.projects[0].id },
    });
    expect(res.statusCode).toBe(400);
  });
});
