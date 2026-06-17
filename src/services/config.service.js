import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class ConfigService {
  async listByTable(table, organizationId) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at');

    if (error) throw new AppError(500, `Failed to fetch ${table}`);
    return data;
  }

  async create(table, organizationId, body) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .insert({ ...body, organization_id: organizationId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError(409, 'Already exists');
      throw new AppError(500, `Failed to create ${table} entry`);
    }
    return data;
  }

  async update(table, id, organizationId, body) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update(body)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new AppError(500, `Failed to update ${table} entry`);
    if (!data) throw new AppError(404, 'Not found');
    return data;
  }

  async checkUsage(table, id, organizationId) {
    const columnMap = {
      project_types: 'project_type_id',
      project_statuses: 'status_id',
    };
    const column = columnMap[table];
    if (!column) return 0;

    const { count } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq(column, id);

    return count || 0;
  }

  async delete(table, id, organizationId) {
    const activeCount = await this.checkUsage(table, id, organizationId);
    if (activeCount > 0) {
      throw new AppError(409, `Cannot delete: ${activeCount} active project(s) use this item. Reassign or remove them first.`);
    }

    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, `Failed to delete ${table} entry`);
  }

  async getOrganization(organizationId) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !data) throw new AppError(404, 'Organization not found');
    return data;
  }

  async updateOrganization(organizationId, body) {
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.projectIdPrefix !== undefined) updates.project_id_prefix = body.projectIdPrefix;
    if (body.settings !== undefined) updates.settings = body.settings;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to update organization');
    return data;
  }
}
