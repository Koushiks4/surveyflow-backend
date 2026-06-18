import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    fileParallelism: false,
    sequence: {
      files: [
        'test/auth.test.js',
        'test/config.test.js',
        'test/clients.test.js',
        'test/projects.test.js',
        'test/tasks.test.js',
        'test/notes.test.js',
        'test/attendance.test.js',
        'test/task-files.test.js',
        'test/payments.test.js',
        'test/delivery.test.js',
        'test/dashboard.test.js',
      ],
    },
  },
});
