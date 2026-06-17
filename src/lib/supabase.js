import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
