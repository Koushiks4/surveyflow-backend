export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(error, request, reply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  if (error.validation) {
    return reply.status(400).send({ error: 'Validation failed', details: error.validation });
  }

  request.log.error(error);
  return reply.status(500).send({ error: 'Internal server error' });
}
