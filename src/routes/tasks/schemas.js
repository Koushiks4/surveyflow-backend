export const createTaskSchema = {
  body: {
    type: 'object',
    required: ['projectId', 'title'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      assignedTo: { type: 'string', format: 'uuid' },
      dueDate: { type: 'string', format: 'date' },
    },
  },
};

export const updateTaskSchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 1 },
      description: { type: 'string' },
      assignedTo: { type: 'string', format: 'uuid' },
      dueDate: { type: 'string', format: 'date' },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};

export const updateTaskStatusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};

export const listTasksSchema = {
  params: {
    type: 'object',
    properties: { projectId: { type: 'string', format: 'uuid' } },
    required: ['projectId'],
  },
};
