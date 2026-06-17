import fp from 'fastify-plugin';
import { AppError } from '../utils/errors.js';

async function rbacPlugin(fastify) {
  fastify.decorate('authorize', function (allowedRoles) {
    return async function (request, reply) {
      if (!request.user) {
        throw new AppError(401, 'Not authenticated');
      }

      const hasRole = request.user.roles.some(role => allowedRoles.includes(role));
      if (!hasRole) {
        throw new AppError(403, 'Insufficient permissions');
      }
    };
  });
}

export default fp(rbacPlugin, { name: 'rbac', dependencies: ['auth'] });
