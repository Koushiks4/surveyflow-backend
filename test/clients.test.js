import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders } from './setup.js';

describe('Client Management', () => {
  let app, adminToken, surveyorToken, officeToken;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    officeToken = await getAuthToken('anita@sathyananda.com');
  });

  it('lists clients with pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeaders(adminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    expect(body.total).toBeGreaterThanOrEqual(3);
    expect(body.page).toBe(1);
  });

  it('searches clients by name', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/clients?search=Prestige',
      headers: authHeaders(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    expect(res.json().data[0].name).toContain('Prestige');
  });

  it('searches clients by mobile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/clients?search=Adarsh',
      headers: authHeaders(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(1);
    expect(res.json().data[0].name).toContain('Adarsh');
  });

  it('gets client by ID with documents and projects', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeaders(adminToken),
    });
    const clientId = listRes.json().data[0].id;

    const res = await app.inject({
      method: 'GET',
      url: `/api/clients/${clientId}`,
      headers: authHeaders(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBeTruthy();
    expect(res.json()).toHaveProperty('documents');
    expect(res.json()).toHaveProperty('projects');
  });

  it('creates a client with location', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeaders(officeToken),
      payload: {
        name: 'Test Client',
        mobile: '+91 99999 00001',
        email: 'test@client.com',
        locationLat: 12.95,
        locationLng: 77.60,
        locationAddress: 'Test Location, Bangalore',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Test Client');
    expect(res.json().location_lat).toBe(12.95);
  });

  it('updates a client', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/clients?search=Test Client',
      headers: authHeaders(adminToken),
    });
    const clientId = listRes.json().data[0].id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/clients/${clientId}`,
      headers: authHeaders(adminToken),
      payload: { name: 'Test Client Updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Test Client Updated');
  });

  it('validates required fields on create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: authHeaders(adminToken),
      payload: { name: 'No Mobile' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('allows surveyor to view clients', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/clients',
      headers: authHeaders(surveyorToken),
    });
    expect(res.statusCode).toBe(200);
  });
});
