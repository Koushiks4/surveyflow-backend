import { NoteService } from '../../services/note.service.js';
import { createNoteSchema, listProjectNotesSchema, listTaskNotesSchema, deleteNoteSchema } from './schemas.js';

export default async function noteRoutes(fastify) {
  const noteService = new NoteService();

  fastify.get('/project/:projectId', { schema: listProjectNotesSchema }, async (request) => {
    return noteService.listByProject(request.params.projectId, request.organizationId);
  });

  fastify.get('/task/:taskId', { schema: listTaskNotesSchema }, async (request) => {
    return noteService.listByTask(request.params.taskId, request.organizationId);
  });

  fastify.post('/', { schema: createNoteSchema }, async (request, reply) => {
    const note = await noteService.create(request.organizationId, request.user.id, request.body);
    return reply.status(201).send(note);
  });

  fastify.delete('/:id', { schema: deleteNoteSchema }, async (request, reply) => {
    await noteService.delete(request.params.id, request.organizationId, request.user.id);
    return reply.status(204).send();
  });
}
