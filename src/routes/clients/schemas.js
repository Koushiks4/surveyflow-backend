export const listClientsSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
    },
  },
};

export const createClientSchema = {
  body: {
    type: 'object',
    required: ['name', 'mobile'],
    properties: {
      name: { type: 'string', minLength: 2 },
      mobile: { type: 'string', minLength: 10 },
      email: { type: 'string', format: 'email' },
      address: { type: 'string' },
      locationLat: { type: 'number' },
      locationLng: { type: 'number' },
      locationAddress: { type: 'string' },
      notes: { type: 'string' },
    },
  },
};

export const updateClientSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      mobile: { type: 'string', minLength: 10 },
      email: { type: 'string', format: 'email' },
      address: { type: 'string' },
      locationLat: { type: 'number' },
      locationLng: { type: 'number' },
      locationAddress: { type: 'string' },
      notes: { type: 'string' },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};
