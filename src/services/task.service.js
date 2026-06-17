import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class TaskService {
  async listByProject(projectId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('project_tasks')
      .select('*, assigned_user:profiles!project_tasks_assigned_to_fkey (id, full_name), created_by_user:profiles!project_tasks_created_by_fkey (id, full_name)')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch tasks');
    return data;
  }

  async getById(id, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('project_tasks')
      .select('*, assigned_user:profiles!project_tasks_assigned_to_fkey (id, full_name), created_by_user:profiles!project_tasks_created_by_fkey (id, full_name), notes:project_notes (id, content, created_at, user:profiles!project_notes_user_id_fkey (id, full_name))')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new AppError(404, 'Task not found');
    return data;
  }

  async create(organizationId, userId, body) {
    const { data, error } = await supabaseAdmin
      .from('project_tasks')
      .insert({
        organization_id: organizationId,
        project_id: body.projectId,
        title: body.title,
        description: body.description,
        assigned_to: body.assignedTo,
        due_date: body.dueDate,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to create task');
    return this.getById(data.id, organizationId);
  }

  async updateStatus(id, organizationId, { status }) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    else updates.completed_at = null;

    const { error } = await supabaseAdmin
      .from('project_tasks')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to update task status');
    return this.getById(id, organizationId);
  }

  async update(id, organizationId, body) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.dueDate !== undefined) updates.due_date = body.dueDate;

    const { error } = await supabaseAdmin
      .from('project_tasks')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to update task');
    return this.getById(id, organizationId);
  }

  async delete(id, organizationId) {
    const { error } = await supabaseAdmin
      .from('project_tasks')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to delete task');
  }
}
