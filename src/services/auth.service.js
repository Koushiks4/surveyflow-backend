import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class AuthService {
  async register({ organizationName, slug, fullName, email, password, phone }) {
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      throw new AppError(409, 'Organization slug already exists');
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: organizationName, slug })
      .select()
      .single();

    if (orgError) throw new AppError(500, 'Failed to create organization');

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      throw new AppError(400, authError.message);
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        organization_id: org.id,
        full_name: fullName,
        email,
        phone,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      throw new AppError(500, 'Failed to create profile');
    }

    const { data: superAdminRole } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single();

    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authUser.user.id, role_id: superAdminRole.id });

    await this.seedDefaultConfig(org.id);

    return { organization: org, user: { id: authUser.user.id, email, fullName } };
  }

  async seedDefaultConfig(organizationId) {
    const defaultStatuses = [
      { name: 'Pending', color: '#F59E0B', display_order: 0, is_default: true },
      { name: 'In Progress', color: '#3B82F6', display_order: 1 },
      { name: 'Completed', color: '#10B981', display_order: 2 },
    ];

    const defaultTypes = [
      { name: 'Land Survey' },
      { name: 'Building Survey' },
      { name: 'Topographical Survey' },
    ];

    const defaultExpenseCategories = [
      { name: 'Survey Cost' },
      { name: 'Staff Cost' },
      { name: 'Travel' },
      { name: 'Others' },
    ];

    await supabaseAdmin.from('project_statuses').insert(
      defaultStatuses.map(s => ({ ...s, organization_id: organizationId }))
    );
    await supabaseAdmin.from('project_types').insert(
      defaultTypes.map(t => ({ ...t, organization_id: organizationId }))
    );
    await supabaseAdmin.from('expense_categories').insert(
      defaultExpenseCategories.map(c => ({ ...c, organization_id: organizationId }))
    );
  }
}
