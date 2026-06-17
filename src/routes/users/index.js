import { UserService } from '../../services/user.service.js';
import { listUsersSchema, createUserSchema, updateUserSchema } from './schemas.js';

export default async function userRoutes(fastify) {
  const userService = new UserService();
  const adminRoles = ['super_admin', 'admin'];

  fastify.get('/', {
    schema: listUsersSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    return userService.list(request.organizationId, request.query);
  });

  fastify.get('/me', async (request) => {
    return userService.getById(request.user.id, request.organizationId);
  });

  fastify.get('/directory', async (request) => {
    return userService.directory(request.organizationId);
  });

  fastify.get('/roles', async () => {
    return userService.listRoles();
  });

  fastify.get('/:id', {
    schema: { params: updateUserSchema.params },
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    return userService.getById(request.params.id, request.organizationId);
  });

  fastify.post('/', {
    schema: createUserSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request, reply) => {
    const user = await userService.create(request.organizationId, request.body);
    return reply.status(201).send(user);
  });

  fastify.patch('/:id', {
    schema: updateUserSchema,
    preHandler: [fastify.authorize(adminRoles)],
  }, async (request) => {
    return userService.update(request.params.id, request.organizationId, request.body);
  });
}
