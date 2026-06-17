import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  host: process.env.HOST || '0.0.0.0',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

const required = ['supabaseUrl', 'supabaseServiceRoleKey', 'supabaseAnonKey'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}
