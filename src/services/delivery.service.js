import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class DeliveryService {
  // Deliverables
  async listDeliverables(projectId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('project_deliverables')
      .select('*, uploader:profiles!project_deliverables_uploaded_by_fkey (id, full_name)')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch deliverables');
    return data;
  }

  async uploadDeliverable(organizationId, projectId, userId, file, description) {
    if (/[^a-zA-Z0-9._-]/.test(file.filename)) {
      throw new AppError(400, 'File name contains invalid characters. Please rename using only letters, numbers, dots, hyphens, and underscores.');
    }

    const buffer = await file.toBuffer();
    const filePath = `${organizationId}/deliverables/${projectId}/${Date.now()}-${file.filename}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.mimetype || 'application/octet-stream' });

    if (uploadError) throw new AppError(500, 'Failed to upload file');

    const { data, error } = await supabaseAdmin
      .from('project_deliverables')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        file_name: file.filename,
        file_path: filePath,
        file_size: buffer.length,
        file_type: file.mimetype,
        description: description || null,
        uploaded_by: userId,
      })
      .select('*, uploader:profiles!project_deliverables_uploaded_by_fkey (id, full_name)')
      .single();

    if (error) throw new AppError(500, 'Failed to save deliverable');
    return data;
  }

  async deleteDeliverable(id, organizationId) {
    const { data } = await supabaseAdmin
      .from('project_deliverables')
      .select('file_path')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!data) throw new AppError(404, 'Deliverable not found');
    await supabaseAdmin.storage.from('documents').remove([data.file_path]);
    await supabaseAdmin.from('project_deliverables').delete().eq('id', id);
  }

  async getDeliverableUrl(id, organizationId) {
    const { data } = await supabaseAdmin
      .from('project_deliverables')
      .select('file_path')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!data) throw new AppError(404, 'Deliverable not found');
    const { data: signed } = await supabaseAdmin.storage.from('documents').createSignedUrl(data.file_path, 3600);
    return { url: signed.signedUrl };
  }

  // Closure checklist config
  async listChecklistItems(organizationId) {
    const { data, error } = await supabaseAdmin
      .from('closure_checklist_items')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw new AppError(500, 'Failed to fetch checklist items');
    return data;
  }

  async createChecklistItem(organizationId, body) {
    const { data, error } = await supabaseAdmin
      .from('closure_checklist_items')
      .insert({
        organization_id: organizationId,
        title: body.title,
        display_order: body.displayOrder || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError(409, 'Checklist item already exists');
      throw new AppError(500, 'Failed to create checklist item');
    }
    return data;
  }

  async deleteChecklistItem(id, organizationId) {
    await supabaseAdmin.from('closure_checklist_items').delete().eq('id', id).eq('organization_id', organizationId);
  }

  // Project closure checks
  async getProjectChecklist(projectId, organizationId) {
    const items = await this.listChecklistItems(organizationId);

    const { data: checks } = await supabaseAdmin
      .from('project_closure_checks')
      .select('*, checker:profiles!project_closure_checks_checked_by_fkey (id, full_name)')
      .eq('project_id', projectId);

    const checkMap = Object.fromEntries((checks || []).map(c => [c.checklist_item_id, c]));

    return items.map(item => ({
      ...item,
      checked: checkMap[item.id]?.checked || false,
      checked_by: checkMap[item.id]?.checker || null,
      checked_at: checkMap[item.id]?.checked_at || null,
    }));
  }

  async toggleChecklistItem(projectId, checklistItemId, userId, checked) {
    const { data: existing } = await supabaseAdmin
      .from('project_closure_checks')
      .select('id')
      .eq('project_id', projectId)
      .eq('checklist_item_id', checklistItemId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from('project_closure_checks')
        .update({
          checked,
          checked_by: checked ? userId : null,
          checked_at: checked ? new Date().toISOString() : null,
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('project_closure_checks')
        .insert({
          project_id: projectId,
          checklist_item_id: checklistItemId,
          checked,
          checked_by: checked ? userId : null,
          checked_at: checked ? new Date().toISOString() : null,
        });
    }
  }

  async revokeDelivery(projectId, organizationId) {
    const { error } = await supabaseAdmin
      .from('projects')
      .update({
        delivery_confirmed_at: null,
        delivery_confirmed_by: null,
        delivery_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to revoke delivery confirmation');
  }

  // Delivery confirmation
  async confirmDelivery(projectId, organizationId, userId, notes) {
    const { error } = await supabaseAdmin
      .from('projects')
      .update({
        delivery_confirmed_at: new Date().toISOString(),
        delivery_confirmed_by: userId,
        delivery_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to confirm delivery');
  }

  async getDeliveryStatus(projectId, organizationId) {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('delivery_confirmed_at, delivery_confirmed_by, delivery_notes')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !project) {
      return { confirmed: false, confirmed_at: null, confirmed_by: null, notes: null };
    }

    let confirmer = null;
    if (project.delivery_confirmed_by) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .eq('id', project.delivery_confirmed_by)
        .single();
      confirmer = data;
    }

    return {
      confirmed: !!project.delivery_confirmed_at,
      confirmed_at: project.delivery_confirmed_at,
      confirmed_by: confirmer,
      notes: project.delivery_notes,
    };
  }
}
