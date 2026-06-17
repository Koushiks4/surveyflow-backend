import fp from 'fastify-plugin';
import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

async function authPlugin(fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing authorization header');
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError(401, 'Invalid or expired token');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        user_roles (
          role:roles (name, display_name)
        )
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new AppError(401, 'User profile not found');
    }

    if (!profile.is_active) {
      throw new AppError(403, 'Account is deactivated');
    }

    request.user = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      organizationId: profile.organization_id,
      roles: profile.user_roles.map(ur => ur.role.name),
    };
    request.organizationId = profile.organization_id;
  });
}

export default fp(authPlugin, { name: 'auth' });
