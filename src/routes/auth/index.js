import { AuthService } from '../../services/auth.service.js';
import { registerSchema } from './schemas.js';

export default async function authRoutes(fastify) {
  const authService = new AuthService();

  fastify.post('/register', { schema: registerSchema }, async (request, reply) => {
    const result = await authService.register(request.body);
    return reply.status(201).send(result);
  });
}
