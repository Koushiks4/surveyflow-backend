export const registerSchema = {
  body: {
    type: 'object',
    required: ['organizationName', 'slug', 'fullName', 'email', 'password'],
    properties: {
      organizationName: { type: 'string', minLength: 2 },
      slug: { type: 'string', pattern: '^[a-z0-9-]+$', minLength: 2, maxLength: 50 },
      fullName: { type: 'string', minLength: 2 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      phone: { type: 'string' },
    },
  },
};
