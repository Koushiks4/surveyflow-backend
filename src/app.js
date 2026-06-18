import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from './config/env.js';
import { errorHandler } from './utils/errors.js';
import authPlugin from './plugins/auth.js';
import tenantPlugin from './plugins/tenant.js';
import rbacPlugin from './plugins/rbac.js';
import authRoutes from './routes/auth/index.js';
import userRoutes from './routes/users/index.js';
import configRoutes from './routes/config/index.js';
import clientRoutes from './routes/clients/index.js';
import projectRoutes from './routes/projects/index.js';
import dashboardRoutes from './routes/dashboard/index.js';
import attendanceRoutes from './routes/attendance/index.js';
import taskRoutes from './routes/tasks/index.js';
import noteRoutes from './routes/notes/index.js';
import paymentRoutes from './routes/payments/index.js';
import deliveryRoutes from './routes/delivery/index.js';

export async function buildApp(opts = {}) {
  const app = Fastify({ logger: opts.logger ?? true, ...opts });

  await app.register(cors, {
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    attachFieldsToBody: false,
  });

  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authPlugin);
  await app.register(tenantPlugin);
  await app.register(rbacPlugin);

  await app.register(authRoutes, { prefix: '/auth' });

  await app.register(async function apiRoutes(app) {
    app.addHook('onRequest', app.authenticate);

    await app.register(userRoutes, { prefix: '/users' });
    await app.register(configRoutes, { prefix: '/config' });
    await app.register(clientRoutes, { prefix: '/clients' });
    await app.register(projectRoutes, { prefix: '/projects' });
    await app.register(dashboardRoutes, { prefix: '/dashboard' });
    await app.register(attendanceRoutes, { prefix: '/attendance' });
    await app.register(taskRoutes, { prefix: '/tasks' });
    await app.register(noteRoutes, { prefix: '/notes' });
    await app.register(paymentRoutes, { prefix: '/payments' });
    await app.register(deliveryRoutes, { prefix: '/delivery' });
  }, { prefix: '/api' });

  return app;
}
