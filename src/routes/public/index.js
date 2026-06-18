import { DeliveryService } from '../../services/delivery.service.js';

export default async function publicRoutes(fastify) {
  const deliveryService = new DeliveryService();

  fastify.get('/delivery/:token', async (request) => {
    return deliveryService.getPublicDelivery(request.params.token);
  });

  fastify.get('/delivery/:token/file/:fileId/url', async (request) => {
    return deliveryService.getPublicDeliverableUrl(request.params.token, request.params.fileId);
  });

  fastify.post('/delivery/:token/confirm', async (request) => {
    return deliveryService.confirmPublicDelivery(request.params.token, request.body?.comment);
  });
}
