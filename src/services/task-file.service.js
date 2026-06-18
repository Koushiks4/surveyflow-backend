import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class TaskFileService {
  async listByTask(taskId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('task_files')
      .select('*, uploader:profiles!task_files_uploaded_by_fkey (id, full_name)')
      .eq('task_id', taskId)
      .eq('organization_id', organizationId)
      .order('file_name')
      .order('version', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch task files');
    return data;
  }

  async upload(organizationId, taskId, userId, file) {
    if (/[^a-zA-Z0-9._-]/.test(file.filename)) {
      throw new AppError(400, 'File name contains invalid characters (spaces or special characters). Please rename the file using only letters, numbers, dots, hyphens, and underscores, then upload again.');
    }

    const { count } = await supabaseAdmin
      .from('task_files')
      .select('id', { count: 'exact', head: true })
      .eq('task_id', taskId)
      .eq('organization_id', organizationId)
      .eq('file_name', file.filename);

    const version = (count || 0) + 1;
    const storageName = `${file.filename}-v${version}`;
    const filePath = `${organizationId}/tasks/${taskId}/${storageName}`;

    let buffer;
    try {
      buffer = await file.toBuffer();
    } catch (err) {
      console.error('File buffer error:', err.message);
      throw new AppError(400, 'Failed to read uploaded file');
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message, uploadError);
      throw new AppError(500, 'Failed to upload file');
    }

    const { data, error } = await supabaseAdmin
      .from('task_files')
      .insert({
        organization_id: organizationId,
        task_id: taskId,
        file_name: file.filename,
        file_path: filePath,
        file_size: buffer.length,
        file_type: file.mimetype,
        version,
        uploaded_by: userId,
      })
      .select('*, uploader:profiles!task_files_uploaded_by_fkey (id, full_name)')
      .single();

    if (error) throw new AppError(500, 'Failed to save file record');
    return data;
  }

  async getDownloadUrl(fileId, organizationId) {
    const { data: file } = await supabaseAdmin
      .from('task_files')
      .select('file_path')
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .single();

    if (!file) throw new AppError(404, 'File not found');

    const { data } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(file.file_path, 3600);

    return { url: data.signedUrl };
  }

  async delete(fileId, organizationId) {
    const { data: file } = await supabaseAdmin
      .from('task_files')
      .select('file_path')
      .eq('id', fileId)
      .eq('organization_id', organizationId)
      .single();

    if (!file) throw new AppError(404, 'File not found');

    await supabaseAdmin.storage.from('documents').remove([file.file_path]);
    await supabaseAdmin.from('task_files').delete().eq('id', fileId);
  }
}
