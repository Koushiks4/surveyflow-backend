const assignmentItem = {
  type: 'object',
  required: ['userId', 'roleId'],
  properties: {
    userId: { type: 'string', format: 'uuid' },
    roleId: { type: 'string', format: 'uuid' },
  },
};

export const listProjectsSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      statusId: { type: 'string', format: 'uuid' },
      clientId: { type: 'string', format: 'uuid' },
      assignedTo: { type: 'string', format: 'uuid' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  },
};

export const createProjectSchema = {
  body: {
    type: 'object',
    required: ['clientId', 'title'],
    properties: {
      clientId: { type: 'string', format: 'uuid' },
      projectTypeId: { type: 'string', format: 'uuid' },
      statusId: { type: 'string', format: 'uuid' },
      title: { type: 'string', minLength: 2 },
      description: { type: 'string' },
      locationLat: { type: 'number' },
      locationLng: { type: 'number' },
      locationAddress: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      expectedEndDate: { type: 'string', format: 'date' },
      assignments: { type: 'array', items: assignmentItem },
    },
  },
};

export const updateProjectSchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string', minLength: 2 },
      description: { type: 'string' },
      clientId: { type: 'string', format: 'uuid' },
      projectTypeId: { type: 'string', format: 'uuid' },
      statusId: { type: 'string', format: 'uuid' },
      locationLat: { type: 'number' },
      locationLng: { type: 'number' },
      locationAddress: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      expectedEndDate: { type: 'string', format: 'date' },
      actualEndDate: { type: 'string', format: 'date' },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};

export const updateAssignmentsSchema = {
  body: {
    type: 'object',
    required: ['assignments'],
    properties: {
      assignments: { type: 'array', items: assignmentItem },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};
