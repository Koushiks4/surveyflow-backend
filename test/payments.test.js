import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, getAuthToken, authHeaders, getTestContext } from './setup.js';

describe('Payments', () => {
  let app, adminToken, teamLeadToken, surveyorToken, ctx;
  let createdEntryId;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await getAuthToken('rajesh@sathyananda.com');
    teamLeadToken = await getAuthToken('suresh@sathyananda.com');
    surveyorToken = await getAuthToken('vikram@sathyananda.com');
    ctx = await getTestContext();
  });

  describe('Quotes', () => {
    it('sets a project quote', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/payments/project/${ctx.projects[0].id}/quote`,
        headers: authHeaders(adminToken),
        payload: { quotedAmount: 300000 },
      });
      expect(res.statusCode).toBe(200);
      expect(parseFloat(res.json().quoted_amount)).toBe(300000);
    });

    it('updates an existing quote', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/payments/project/${ctx.projects[0].id}/quote`,
        headers: authHeaders(adminToken),
        payload: { quotedAmount: 350000 },
      });
      expect(res.statusCode).toBe(200);
      expect(parseFloat(res.json().quoted_amount)).toBe(350000);
    });

    it('allows team lead to set quotes', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/payments/project/${ctx.projects[1].id}/quote`,
        headers: authHeaders(teamLeadToken),
        payload: { quotedAmount: 500000 },
      });
      expect(res.statusCode).toBe(200);
    });

    it('blocks surveyor from setting quotes', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/payments/project/${ctx.projects[0].id}/quote`,
        headers: authHeaders(surveyorToken),
        payload: { quotedAmount: 999999 },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Payment Entries', () => {
    it('creates an advance entry', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(adminToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'advance',
          amount: 50000,
          paymentMethod: 'bank_transfer',
          date: '2026-06-18',
          description: 'Test advance payment',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().type).toBe('advance');
      expect(parseFloat(res.json().amount)).toBe(50000);
      expect(res.json().payment_method).toBe('bank_transfer');
      expect(res.json().created_by_user).toHaveProperty('full_name');
      createdEntryId = res.json().id;
    });

    it('creates an expense entry with category', async () => {
      const categoriesRes = await app.inject({
        method: 'GET',
        url: '/api/config/expense-categories',
        headers: authHeaders(adminToken),
      });
      const category = categoriesRes.json()[0];

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(teamLeadToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'expense',
          amount: 12000,
          categoryId: category.id,
          paymentMethod: 'cash',
          date: '2026-06-18',
          description: 'Equipment rental',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().type).toBe('expense');
      expect(res.json().category.name).toBe(category.name);
    });

    it('lists payment entries for a project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/payments/project/${ctx.projects[0].id}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().length).toBeGreaterThanOrEqual(2);
      expect(res.json()[0]).toHaveProperty('type');
      expect(res.json()[0]).toHaveProperty('amount');
      expect(res.json()[0]).toHaveProperty('created_by_user');
    });

    it('validates required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(adminToken),
        payload: { projectId: ctx.projects[0].id, type: 'advance' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('validates payment type enum', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(adminToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'invalid',
          amount: 100,
          date: '2026-06-18',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('validates minimum amount', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(adminToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'advance',
          amount: 0,
          date: '2026-06-18',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('deletes a payment entry', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/payments/${createdEntryId}`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(204);
    });

    it('returns 404 for non-existent entry', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/payments/00000000-0000-0000-0000-000000000000',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('RBAC', () => {
    it('blocks surveyor from listing payments', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/payments/project/${ctx.projects[0].id}`,
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
    });

    it('blocks surveyor from creating payments', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(surveyorToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'advance',
          amount: 1000,
          date: '2026-06-18',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('allows team lead to create payments', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: authHeaders(teamLeadToken),
        payload: {
          projectId: ctx.projects[0].id,
          type: 'advance',
          amount: 5000,
          paymentMethod: 'upi',
          date: '2026-06-18',
          description: 'Team lead created',
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('Summary & Reports', () => {
    it('returns project summary with correct totals', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/payments/project/${ctx.projects[0].id}/summary`,
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const summary = res.json();
      expect(summary).toHaveProperty('quoted');
      expect(summary).toHaveProperty('advances');
      expect(summary).toHaveProperty('expenses');
      expect(summary).toHaveProperty('balance');
      expect(summary).toHaveProperty('profit');
      expect(summary.quoted).toBeGreaterThanOrEqual(0);
      expect(summary.balance).toBe(summary.quoted - summary.advances);
      expect(summary.profit).toBe(summary.advances - summary.expenses);
    });

    it('returns monthly report', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/report/monthly?year=2026&month=6',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      const report = res.json();
      expect(report).toHaveProperty('projects');
      expect(report).toHaveProperty('totals');
      expect(Array.isArray(report.projects)).toBe(true);
      expect(report.totals).toHaveProperty('quoted');
      expect(report.totals).toHaveProperty('advances');
      expect(report.totals).toHaveProperty('expenses');
      expect(report.totals).toHaveProperty('profit');
    });

    it('returns monthly report with project details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/report/monthly?year=2026&month=6',
        headers: authHeaders(adminToken),
      });
      const report = res.json();
      if (report.projects.length > 0) {
        const project = report.projects[0];
        expect(project).toHaveProperty('project_number');
        expect(project).toHaveProperty('client_name');
        expect(project).toHaveProperty('advances');
        expect(project).toHaveProperty('expenses');
        expect(project.profit).toBe(project.advances - project.expenses);
      }
    });

    it('returns empty report for month with no entries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/report/monthly?year=2020&month=1',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().projects).toEqual([]);
      expect(res.json().totals.advances).toBe(0);
    });

    it('validates month range', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/report/monthly?year=2026&month=13',
        headers: authHeaders(adminToken),
      });
      expect(res.statusCode).toBe(400);
    });

    it('blocks surveyor from monthly report', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/report/monthly?year=2026&month=6',
        headers: authHeaders(surveyorToken),
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
