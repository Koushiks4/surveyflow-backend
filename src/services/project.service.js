import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class ProjectService {
  async list(organizationId, { search, statusId, clientId, assignedTo, page = 1, limit = 25 } = {}) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('projects')
      .select(`
        *,
        client:clients (id, name, mobile),
        project_type:project_types (id, name),
        status:project_statuses (id, name, color),
        project_assignments (
          user:profiles!project_assignments_user_id_fkey (id, full_name, email),
          role:roles (id, name, display_name)
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,project_number.ilike.%${search}%`);
    }
    if (statusId) query = query.eq('status_id', statusId);
    if (clientId) query = query.eq('client_id', clientId);

    const { data, error, count } = await query;
    if (error) throw new AppError(500, 'Failed to fetch projects');

    let projects = data;
    if (assignedTo) {
      projects = projects.filter(p =>
        p.project_assignments.some(a => a.user.id === assignedTo)
      );
    }

    return { data: projects, total: count, page, limit };
  }

  async getById(id, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        client:clients (id, name, mobile, email),
        project_type:project_types (id, name),
        status:project_statuses (id, name, color),
        project_assignments (
          id,
          user:profiles!project_assignments_user_id_fkey (id, full_name, email, phone),
          role:roles (id, name, display_name)
        ),
        documents (*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      if (error) console.error('getById error:', error.message, error.details);
      throw new AppError(404, 'Project not found');
    }
    return data;
  }

  async create(organizationId, userId, body) {
    const { data: projectNumber } = await supabaseAdmin.rpc('generate_project_number', {
      org_id: organizationId,
    });

    if (!projectNumber) throw new AppError(500, 'Failed to generate project number');

    let statusId = body.statusId;
    if (!statusId) {
      const { data: defaultStatus } = await supabaseAdmin
        .from('project_statuses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .single();
      statusId = defaultStatus?.id;
    }

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        organization_id: organizationId,
        project_number: projectNumber,
        client_id: body.clientId,
        project_type_id: body.projectTypeId,
        status_id: statusId,
        title: body.title,
        description: body.description,
        location_lat: body.locationLat,
        location_lng: body.locationLng,
        location_address: body.locationAddress,
        start_date: body.startDate,
        expected_end_date: body.expectedEndDate,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to create project');

    if (body.assignments?.length) {
      await this.setAssignments(project.id, userId, body.assignments);
    }

    return this.getById(project.id, organizationId);
  }

  async update(id, organizationId, body) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.clientId !== undefined) updates.client_id = body.clientId;
    if (body.projectTypeId !== undefined) updates.project_type_id = body.projectTypeId;
    if (body.statusId !== undefined) updates.status_id = body.statusId;
    if (body.locationLat !== undefined) updates.location_lat = body.locationLat;
    if (body.locationLng !== undefined) updates.location_lng = body.locationLng;
    if (body.locationAddress !== undefined) updates.location_address = body.locationAddress;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.expectedEndDate !== undefined) updates.expected_end_date = body.expectedEndDate;
    if (body.actualEndDate !== undefined) updates.actual_end_date = body.actualEndDate;

    const { error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw new AppError(500, 'Failed to update project');

    return this.getById(id, organizationId);
  }

  async setAssignments(projectId, assignedBy, assignments) {
    const userIds = assignments.map(a => a.userId);
    const duplicates = userIds.filter((id, i) => userIds.indexOf(id) !== i);
    if (duplicates.length) {
      throw new AppError(400, 'A user can only be assigned once per project');
    }

    await supabaseAdmin
      .from('project_assignments')
      .delete()
      .eq('project_id', projectId);

    if (assignments.length) {
      const inserts = assignments.map(a => ({
        project_id: projectId,
        user_id: a.userId,
        role_id: a.roleId,
        assigned_by: assignedBy,
      }));
      const { error } = await supabaseAdmin
        .from('project_assignments')
        .insert(inserts);

      if (error) throw new AppError(500, 'Failed to set assignments');
    }
  }

  async uploadDocument(organizationId, projectId, userId, file, category) {
    const fileName = `${Date.now()}-${file.filename}`;
    const filePath = `${organizationId}/projects/${projectId}/${fileName}`;

    const buffer = await file.toBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.mimetype });

    if (uploadError) throw new AppError(500, 'Failed to upload file');

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        file_name: file.filename,
        file_path: filePath,
        file_size: buffer.length,
        file_type: file.mimetype,
        uploaded_by: userId,
        category: category || 'other',
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to save document record');
    return data;
  }
}
