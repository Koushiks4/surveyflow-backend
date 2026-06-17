export const createNoteSchema = {
  body: {
    type: 'object',
    required: ['projectId', 'content'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      taskId: { type: 'string', format: 'uuid' },
      content: { type: 'string', minLength: 1 },
    },
  },
};

export const listProjectNotesSchema = {
  params: {
    type: 'object',
    properties: { projectId: { type: 'string', format: 'uuid' } },
    required: ['projectId'],
  },
};

export const listTaskNotesSchema = {
  params: {
    type: 'object',
    properties: { taskId: { type: 'string', format: 'uuid' } },
    required: ['taskId'],
  },
};

export const deleteNoteSchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};
