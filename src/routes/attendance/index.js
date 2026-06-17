import { AttendanceService } from '../../services/attendance.service.js';
import { checkInSchema, checkOutSchema, listAttendanceSchema } from './schemas.js';

export default async function attendanceRoutes(fastify) {
  const attendanceService = new AttendanceService();

  fastify.post('/check-in', { schema: checkInSchema }, async (request, reply) => {
    const log = await attendanceService.checkIn(request.organizationId, request.user.id, request.body);
    return reply.status(201).send(log);
  });

  fastify.post('/check-out', { schema: checkOutSchema }, async (request) => {
    return attendanceService.checkOut(request.organizationId, request.user.id, request.body);
  });

  fastify.get('/active', async (request) => {
    return attendanceService.getActiveCheckIn(request.user.id);
  });

  fastify.get('/project/:projectId', { schema: listAttendanceSchema }, async (request) => {
    return attendanceService.listByProject(request.params.projectId, request.organizationId, request.query);
  });
}
