export const createPaymentSchema = {
  body: {
    type: 'object',
    required: ['projectId', 'type', 'amount', 'date'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      type: { type: 'string', enum: ['advance', 'expense'] },
      amount: { type: 'number', minimum: 0.01 },
      categoryId: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      paymentMethod: { type: 'string', enum: ['cash', 'bank_transfer', 'upi', 'cheque'] },
      date: { type: 'string', format: 'date' },
    },
  },
};

export const setQuoteSchema = {
  body: {
    type: 'object',
    required: ['quotedAmount'],
    properties: {
      quotedAmount: { type: 'number', minimum: 0 },
    },
  },
  params: {
    type: 'object',
    properties: { projectId: { type: 'string', format: 'uuid' } },
    required: ['projectId'],
  },
};

export const projectParamSchema = {
  params: {
    type: 'object',
    properties: { projectId: { type: 'string', format: 'uuid' } },
    required: ['projectId'],
  },
};

export const monthlyReportSchema = {
  querystring: {
    type: 'object',
    required: ['year', 'month'],
    properties: {
      year: { type: 'integer', minimum: 2020, maximum: 2100 },
      month: { type: 'integer', minimum: 1, maximum: 12 },
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
