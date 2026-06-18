import { PaymentService } from '../../services/payment.service.js';
import { AppError } from '../../utils/errors.js';
import {
  createPaymentSchema,
  setQuoteSchema,
  projectParamSchema,
  monthlyReportSchema,
  idParamSchema,
} from './schemas.js';

export default async function paymentRoutes(fastify) {
  const paymentService = new PaymentService();
  const canManage = ['super_admin', 'admin', 'team_lead'];

  fastify.get('/project/:projectId', {
    schema: projectParamSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.listByProject(request.params.projectId, request.organizationId);
  });

  fastify.get('/project/:projectId/summary', {
    schema: projectParamSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.getProjectSummary(request.params.projectId, request.organizationId);
  });

  fastify.post('/', {
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    const isMultipart = request.isMultipart();

    let body;
    let receipt = null;

    if (isMultipart) {
      const parts = request.parts();
      const fields = {};
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'receipt') {
          receipt = part;
        } else if (part.type === 'field') {
          fields[part.fieldname] = part.value;
        }
      }
      body = {
        projectId: fields.projectId,
        type: fields.type,
        amount: parseFloat(fields.amount),
        categoryId: fields.categoryId || undefined,
        description: fields.description || undefined,
        paymentMethod: fields.paymentMethod || undefined,
        date: fields.date,
        receipt,
      };
    } else {
      body = request.body;
    }

    if (!body.projectId || !body.type || !body.amount || !body.date) {
      throw new AppError(400, 'Missing required fields: projectId, type, amount, date');
    }
    if (!['advance', 'expense'].includes(body.type)) {
      throw new AppError(400, 'Type must be "advance" or "expense"');
    }
    if (body.amount <= 0) {
      throw new AppError(400, 'Amount must be greater than 0');
    }

    const entry = await paymentService.create(request.organizationId, request.user.id, body);
    return reply.status(201).send(entry);
  });

  fastify.patch('/:id', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.update(request.params.id, request.organizationId, request.body);
  });

  fastify.delete('/:id', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request, reply) => {
    await paymentService.delete(request.params.id, request.organizationId);
    return reply.status(204).send();
  });

  fastify.patch('/project/:projectId/quote', {
    schema: setQuoteSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.setQuote(
      request.params.projectId,
      request.organizationId,
      request.user.id,
      request.body.quotedAmount
    );
  });

  fastify.get('/report/monthly', {
    schema: monthlyReportSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.getMonthlyReport(
      request.organizationId,
      request.query.year,
      request.query.month
    );
  });

  fastify.get('/:id/receipt-url', {
    schema: idParamSchema,
    preHandler: [fastify.authorize(canManage)],
  }, async (request) => {
    return paymentService.getReceiptUrl(request.params.id, request.organizationId);
  });
}
