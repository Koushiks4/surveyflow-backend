import { ConfigService } from '../../services/config.service.js';
import {
  createProjectTypeSchema,
  createProjectStatusSchema,
  createExpenseCategorySchema,
  updateOrgSchema,
  idParamSchema,
} from './schemas.js';

export default async function configRoutes(fastify) {
  const configService = new ConfigService();
  const adminRoles = ['super_admin', 'admin'];

  fastify.get('/organization', async (request) => {
    return configService.getOrganization(request.organizationId);
  });

  fastify.patch('/organization', {
    schema: updateOrgSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    return configService.updateOrganization(request.organizationId, request.body);
  });

  fastify.get('/project-types', async (request) => {
    return configService.listByTable('project_types', request.organizationId);
  });

  fastify.post('/project-types', {
    schema: createProjectTypeSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    const result = await configService.create('project_types', request.organizationId, request.body);
    return reply.status(201).send(result);
  });

  fastify.patch('/project-types/:id', {
    schema: { ...createProjectTypeSchema, ...idParamSchema },
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    return configService.update('project_types', request.params.id, request.organizationId, request.body);
  });

  fastify.delete('/project-types/:id', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    await configService.delete('project_types', request.params.id, request.organizationId);
    return reply.status(204).send();
  });

  fastify.get('/project-statuses', async (request) => {
    return configService.listByTable('project_statuses', request.organizationId);
  });

  fastify.post('/project-statuses', {
    schema: createProjectStatusSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    const body = {
      name: request.body.name,
      color: request.body.color,
      display_order: request.body.displayOrder,
      is_default: request.body.isDefault,
    };
    const result = await configService.create('project_statuses', request.organizationId, body);
    return reply.status(201).send(result);
  });

  fastify.patch('/project-statuses/:id', {
    schema: { ...createProjectStatusSchema, ...idParamSchema },
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    const body = {};
    if (request.body.name !== undefined) body.name = request.body.name;
    if (request.body.color !== undefined) body.color = request.body.color;
    if (request.body.displayOrder !== undefined) body.display_order = request.body.displayOrder;
    if (request.body.isDefault !== undefined) body.is_default = request.body.isDefault;
    return configService.update('project_statuses', request.params.id, request.organizationId, body);
  });

  fastify.delete('/project-statuses/:id', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    await configService.delete('project_statuses', request.params.id, request.organizationId);
    return reply.status(204).send();
  });

  fastify.get('/expense-categories', async (request) => {
    return configService.listByTable('expense_categories', request.organizationId);
  });

  fastify.post('/expense-categories', {
    schema: createExpenseCategorySchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    const result = await configService.create('expense_categories', request.organizationId, request.body);
    return reply.status(201).send(result);
  });

  fastify.delete('/expense-categories/:id', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    await configService.delete('expense_categories', request.params.id, request.organizationId);
    return reply.status(204).send();
  });
}
