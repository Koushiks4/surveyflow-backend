import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class ClientService {
  async list(organizationId, { search, page = 1, limit = 25 } = {}) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw new AppError(500, 'Failed to fetch clients');

    return { data, total: count, page, limit };
  }

  async getById(id, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        documents (*),
        projects (id, project_number, title, status:project_statuses(name, color))
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) throw new AppError(404, 'Client not found');
    return data;
  }

  async create(organizationId, userId, body) {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        address: body.address,
        location_lat: body.locationLat,
        location_lng: body.locationLng,
        location_address: body.locationAddress,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to create client');
    return data;
  }

  async update(id, organizationId, body) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.mobile !== undefined) updates.mobile = body.mobile;
    if (body.email !== undefined) updates.email = body.email;
    if (body.address !== undefined) updates.address = body.address;
    if (body.locationLat !== undefined) updates.location_lat = body.locationLat;
    if (body.locationLng !== undefined) updates.location_lng = body.locationLng;
    if (body.locationAddress !== undefined) updates.location_address = body.locationAddress;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to update client');
    if (!data) throw new AppError(404, 'Client not found');
    return data;
  }

  async uploadDocument(organizationId, clientId, userId, file, category) {
    const fileName = `${Date.now()}-${file.filename}`;
    const filePath = `${organizationId}/clients/${clientId}/${fileName}`;

    const buffer = await file.toBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, { contentType: file.mimetype });

    if (uploadError) throw new AppError(500, 'Failed to upload file');

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        organization_id: organizationId,
        client_id: clientId,
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

  async deleteDocument(documentId, organizationId) {
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('organization_id', organizationId)
      .single();

    if (!doc) throw new AppError(404, 'Document not found');

    await supabaseAdmin.storage.from('documents').remove([doc.file_path]);
    await supabaseAdmin.from('documents').delete().eq('id', documentId);
  }

  async getDocumentUrl(documentId, organizationId) {
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('organization_id', organizationId)
      .single();

    if (!doc) throw new AppError(404, 'Document not found');

    const { data } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);

    return { url: data.signedUrl };
  }
}
