import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class NoteService {
  async listByProject(projectId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('project_notes')
      .select('*, user:profiles!project_notes_user_id_fkey (id, full_name)')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .is('task_id', null)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch notes');
    return data;
  }

  async listByTask(taskId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('project_notes')
      .select('*, user:profiles!project_notes_user_id_fkey (id, full_name)')
      .eq('task_id', taskId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw new AppError(500, 'Failed to fetch notes');
    return data;
  }

  async create(organizationId, userId, body) {
    const { data, error } = await supabaseAdmin
      .from('project_notes')
      .insert({
        organization_id: organizationId,
        project_id: body.projectId,
        task_id: body.taskId || null,
        user_id: userId,
        content: body.content,
      })
      .select('*, user:profiles!project_notes_user_id_fkey (id, full_name)')
      .single();

    if (error) throw new AppError(500, 'Failed to create note');
    return data;
  }

  async delete(id, organizationId, userId) {
    const { data: note } = await supabaseAdmin
      .from('project_notes')
      .select('user_id')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!note) throw new AppError(404, 'Note not found');
    if (note.user_id !== userId) throw new AppError(403, 'You can only delete your own notes');

    const { error } = await supabaseAdmin
      .from('project_notes')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(500, 'Failed to delete note');
  }
}
