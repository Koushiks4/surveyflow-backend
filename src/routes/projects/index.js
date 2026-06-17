import { ProjectService } from '../../services/project.service.js';
import { AppError } from '../../utils/errors.js';
import {
  listProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  updateAssignmentsSchema,
} from './schemas.js';

export default async function projectRoutes(fastify) {
  const projectService = new ProjectService();
  const canManage = ['super_admin', 'admin', 'team_lead', 'office_staff'];

  fastify.get('/', { schema: listProjectsSchema }, async (request) => {
    return projectService.list(request.organizationId, request.query);
  });

  fastify.get('/:id', {
    schema: { params: updateProjectSchema.params },
  }, async (request) => {
    return projectService.getById(request.params.id, request.organizationId);
  });

  fastify.post('/', {
    schema: createProjectSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    const project = await projectService.create(
      request.organizationId,
      request.user.id,
      request.body
    );
    return reply.status(201).send(project);
  });

  fastify.patch('/:id', {
    schema: updateProjectSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return projectService.update(
      request.params.id,
      request.organizationId,
      request.body
    );
  });

  fastify.put('/:id/assignments', {
    schema: updateAssignmentsSchema,
    preHandler: [fastify.authorize(['super_admin', 'admin', 'team_lead'])],
  }, async (request) => {
    await projectService.setAssignments(
      request.params.id,
      request.user.id,
      request.body.assignments
    );
    return projectService.getById(request.params.id, request.organizationId);
  });

  fastify.post('/:id/documents', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) throw new AppError(400, 'No file uploaded');
    const doc = await projectService.uploadDocument(
      request.organizationId,
      request.params.id,
      request.user.id,
      file
    );
    return reply.status(201).send(doc);
  });
}
