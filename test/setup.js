import { buildApp } from '../src/app.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../src/config/env.js';

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = 'Test@1234';
const tokenCache = {};

export async function createTestApp() {
  const app = await buildApp({ logger: false });
  return app;
}

export async function getAuthToken(email) {
  if (tokenCache[email]) return tokenCache[email];

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  tokenCache[email] = data.session.access_token;
  return data.session.access_token;
}

export function authHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

export async function getTestContext() {
  const token = await getAuthToken('rajesh@sathyananda.com');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('email', 'rajesh@sathyananda.com')
    .single();

  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('project_number')
    .limit(4);

  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('organization_id', profile.organization_id);

  const { data: roles } = await supabaseAdmin.from('roles').select('*');
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  const { data: projectTypes } = await supabaseAdmin
    .from('project_types')
    .select('*')
    .eq('organization_id', profile.organization_id);

  const { data: projectStatuses } = await supabaseAdmin
    .from('project_statuses')
    .select('*')
    .eq('organization_id', profile.organization_id);

  return {
    token,
    user: profile,
    orgId: profile.organization_id,
    org: profile.organization,
    projects,
    clients,
    roleMap,
    projectTypes,
    projectStatuses,
  };
}

export { supabaseAdmin };
