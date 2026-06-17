import { ClientService } from '../../services/client.service.js';
import { AppError } from '../../utils/errors.js';
import { listClientsSchema, createClientSchema, updateClientSchema } from './schemas.js';

export default async function clientRoutes(fastify) {
  const clientService = new ClientService();
  const canCreate = ['super_admin', 'admin', 'team_lead', 'office_staff'];

  fastify.get('/', { schema: listClientsSchema }, async (request) => {
    return clientService.list(request.organizationId, request.query);
  });

  fastify.get('/:id', {
    schema: { params: updateClientSchema.params },
  }, async (request) => {
    return clientService.getById(request.params.id, request.organizationId);
  });

  fastify.post('/', {
    schema: createClientSchema,
    preHandler: [fastify.authorize(canCreate)],
  }, async (request, reply) => {
    const client = await clientService.create(
      request.organizationId,
      request.user.id,
      request.body
    );
    return reply.status(201).send(client);
  });

  fastify.patch('/:id', {
    schema: updateClientSchema,
    preHandler: [fastify.authorize(canCreate)],
  }, async (request) => {
    return clientService.update(request.params.id, request.organizationId, request.body);
  });

  fastify.post('/:id/documents', {
    preHandler: [fastify.authorize(canCreate)],
  }, async (request, reply) => {
    const file = await request.file();
    if (!file) throw new AppError(400, 'No file uploaded');
    const doc = await clientService.uploadDocument(
      request.organizationId,
      request.params.id,
      request.user.id,
      file
    );
    return reply.status(201).send(doc);
  });

  fastify.get('/documents/:documentId/url', async (request) => {
    return clientService.getDocumentUrl(request.params.documentId, request.organizationId);
  });

  fastify.delete('/documents/:documentId', {
    preHandler: [fastify.authorize(canCreate)],
  }, async (request, reply) => {
    await clientService.deleteDocument(request.params.documentId, request.organizationId);
    return reply.status(204).send();
  });
}
