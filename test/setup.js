import { buildApp } from '../src/app.js';

export async function createTestApp() {
  const app = await buildApp({ logger: false });
  return app;
}
