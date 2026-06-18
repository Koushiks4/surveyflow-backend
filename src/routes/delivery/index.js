import { DeliveryService } from '../../services/delivery.service.js';
import { AppError } from '../../utils/errors.js';

export default async function deliveryRoutes(fastify) {
  const deliveryService = new DeliveryService();
  const canManage = ['super_admin', 'admin', 'team_lead'];

  // Deliverables
  fastify.get('/project/:projectId/deliverables', async (request) => {
    return deliveryService.listDeliverables(request.params.projectId, request.organizationId);
  });

  fastify.post('/project/:projectId/deliverables', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    const data = await request.file();
    if (!data) throw new AppError(400, 'No file uploaded');
    const description = data.fields?.description?.value || null;
    const result = await deliveryService.uploadDeliverable(
      request.organizationId, request.params.projectId, request.user.id, data, description
    );
    return reply.status(201).send(result);
  });

  fastify.delete('/deliverables/:id', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    await deliveryService.deleteDeliverable(request.params.id, request.organizationId);
    return reply.status(204).send();
  });

  fastify.get('/deliverables/:id/url', async (request) => {
    return deliveryService.getDeliverableUrl(request.params.id, request.organizationId);
  });

  // Closure checklist config
  fastify.get('/checklist-items', async (request) => {
    return deliveryService.listChecklistItems(request.organizationId);
  });

  fastify.post('/checklist-items', {
    preHandler: [fastify.authorize(['super_admin', 'admin'])],
  }, async (request, reply) => {
    const item = await deliveryService.createChecklistItem(request.organizationId, request.body);
    return reply.status(201).send(item);
  });

  fastify.delete('/checklist-items/:id', {
    preHandler: [fastify.authorize(['super_admin', 'admin'])],
  }, async (request, reply) => {
    await deliveryService.deleteChecklistItem(request.params.id, request.organizationId);
    return reply.status(204).send();
  });

  // Project closure checks
  fastify.get('/project/:projectId/checklist', async (request) => {
    return deliveryService.getProjectChecklist(request.params.projectId, request.organizationId);
  });

  fastify.post('/project/:projectId/checklist/:itemId/toggle', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    await deliveryService.toggleChecklistItem(
      request.params.projectId, request.params.itemId, request.user.id, request.body.checked
    );
    return reply.status(200).send({ ok: true });
  });

  // Delivery confirmation
  fastify.get('/project/:projectId/status', async (request) => {
    return deliveryService.getDeliveryStatus(request.params.projectId, request.organizationId);
  });

  fastify.post('/project/:projectId/confirm', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    await deliveryService.confirmDelivery(
      request.params.projectId, request.organizationId, request.user.id, request.body.notes
    );
    return reply.status(200).send({ ok: true });
  });

  fastify.post('/project/:projectId/revoke', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    await deliveryService.revokeDelivery(request.params.projectId, request.organizationId);
    return reply.status(200).send({ ok: true });
  });
}
