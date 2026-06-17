import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class UserService {
  async directory(organizationId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`id, full_name, user_roles (role:roles (id, name, display_name))`)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('full_name');

    if (error) throw new AppError(500, 'Failed to fetch user directory');

    return data.map(u => ({
      id: u.id,
      full_name: u.full_name,
      roles: u.user_roles.map(ur => ur.role),
    }));
  }

  async list(organizationId, { search, role } = {}) {
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        *,
        user_roles (
          role:roles (id, name, display_name)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new AppError(500, 'Failed to fetch users');

    let users = data.map(u => ({
      ...u,
      roles: u.user_roles.map(ur => ur.role),
      user_roles: undefined,
    }));

    if (role) {
      users = users.filter(u => u.roles.some(r => r.name === role));
    }

    return users;
  }

  async getById(id, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        user_roles (
          role:roles (id, name, display_name)
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new AppError(404, 'User not found');

    return {
      ...data,
      roles: data.user_roles.map(ur => ur.role),
      user_roles: undefined,
    };
  }

  async create(organizationId, { fullName, email, password, phone, roleIds }) {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw new AppError(400, authError.message);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        organization_id: organizationId,
        full_name: fullName,
        email,
        phone,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new AppError(500, 'Failed to create profile');
    }

    if (roleIds?.length) {
      const roleInserts = roleIds.map(roleId => ({
        user_id: authUser.user.id,
        role_id: roleId,
      }));
      await supabaseAdmin.from('user_roles').insert(roleInserts);
    }

    return this.getById(authUser.user.id, organizationId);
  }

  async update(id, organizationId, { fullName, phone, isActive, roleIds }) {
    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.is_active = isActive;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to update user');

    if (roleIds !== undefined) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', id);
      if (roleIds.length) {
        await supabaseAdmin.from('user_roles').insert(
          roleIds.map(roleId => ({ user_id: id, role_id: roleId }))
        );
      }
    }

    return this.getById(id, organizationId);
  }

  async listRoles() {
    const { data, error } = await supabaseAdmin
      .from('roles')
      .select('*')
      .order('created_at');

    if (error) throw new AppError(500, 'Failed to fetch roles');
    return data;
  }
}
