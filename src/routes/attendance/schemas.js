export const checkInSchema = {
  body: {
    type: 'object',
    required: ['projectId', 'lat', 'lng'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      lat: { type: 'number' },
      lng: { type: 'number' },
      notes: { type: 'string' },
    },
  },
};

export const checkOutSchema = {
  body: {
    type: 'object',
    required: ['lat', 'lng'],
    properties: {
      lat: { type: 'number' },
      lng: { type: 'number' },
    },
  },
};

export const listAttendanceSchema = {
  params: {
    type: 'object',
    properties: { projectId: { type: 'string', format: 'uuid' } },
    required: ['projectId'],
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  },
};
