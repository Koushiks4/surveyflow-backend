export const createProjectTypeSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
    },
  },
};

export const createProjectStatusSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
      displayOrder: { type: 'integer' },
      isDefault: { type: 'boolean' },
    },
  },
};

export const createExpenseCategorySchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
    },
  },
};

export const updateOrgSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2 },
      projectIdPrefix: { type: 'string', minLength: 1, maxLength: 10 },
      settings: { type: 'object' },
    },
  },
};

export const idParamSchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'string', format: 'uuid' } },
    required: ['id'],
  },
};
