import { DashboardService } from '../../services/dashboard.service.js';

export default async function dashboardRoutes(fastify) {
  const dashboardService = new DashboardService();

  fastify.get('/stats', async (request) => {
    return dashboardService.getStats(
      request.organizationId,
      request.user.id,
      request.user.roles
    );
  });

  fastify.get('/recent-projects', async (request) => {
    return dashboardService.getRecentProjects(
      request.organizationId,
      request.user.id,
      request.user.roles,
      request.query.limit || 10
    );
  });
}
