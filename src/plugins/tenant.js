import fp from 'fastify-plugin';

async function tenantPlugin(fastify) {
  fastify.decorateRequest('organizationId', null);
}

export default fp(tenantPlugin, { name: 'tenant', dependencies: ['auth'] });
