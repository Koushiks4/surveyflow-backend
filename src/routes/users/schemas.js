export const listUsersSchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      role: { type: 'string' },
    },
  },
};

export const createUserSchema = {
  body: {
    type: 'object',
    required: ['fullName', 'email', 'password'],
    properties: {
      fullName: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      phone: { type: 'string' },
      roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
  },
};

export const updateUserSchema = {
  body: {
    type: 'object',
    properties: {
      fullName: { type: 'string', minLength: 2 },
      phone: { type: 'string' },
      isActive: { type: 'boolean' },
      roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
  },
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};
