import { TaskService } from '../../services/task.service.js';
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema, listTasksSchema } from './schemas.js';

export default async function taskRoutes(fastify) {
  const taskService = new TaskService();
  const canCreate = ['super_admin', 'admin', 'team_lead'];

  fastify.get('/project/:projectId', { schema: listTasksSchema }, async (request) => {
    return taskService.listByProject(request.params.projectId, request.organizationId);
  });

  fastify.get('/:id', { schema: { params: updateTaskSchema.params } }, async (request) => {
    return taskService.getById(request.params.id, request.organizationId);
  });

  fastify.post('/', {
    schema: createTaskSchema,
    preHandler: [fastify.authorize(canCreate)],
  }, async (request, reply) => {
    const task = await taskService.create(request.organizationId, request.user.id, request.body);
    return reply.status(201).send(task);
  });

  fastify.patch('/:id', {
    schema: updateTaskSchema,
    preHandler: [fastify.authorize(canCreate)],
  }, async (request) => {
    return taskService.update(request.params.id, request.organizationId, request.body);
  });

  fastify.patch('/:id/status', { schema: updateTaskStatusSchema }, async (request) => {
    return taskService.updateStatus(request.params.id, request.organizationId, request.body);
  });

  fastify.delete('/:id', {
    schema: { params: updateTaskSchema.params },
    preHandler: [fastify.authorize(canCreate)],
  }, async (request, reply) => {
    await taskService.delete(request.params.id, request.organizationId);
    return reply.status(204).send();
  });
}
