import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class AttendanceService {
  async checkIn(organizationId, userId, { projectId, lat, lng, notes }) {
    const { data: openLog } = await supabaseAdmin
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .is('check_out_at', null)
      .single();

    if (openLog) {
      throw new AppError(400, 'You already have an active check-in. Check out first.');
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_logs')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        user_id: userId,
        check_in_lat: lat,
        check_in_lng: lng,
        notes,
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to check in');
    return data;
  }

  async checkOut(organizationId, userId, { lat, lng }) {
    const { data: openLog } = await supabaseAdmin
      .from('attendance_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .is('check_out_at', null)
      .single();

    if (!openLog) {
      throw new AppError(400, 'No active check-in found');
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_logs')
      .update({
        check_out_at: new Date().toISOString(),
        check_out_lat: lat,
        check_out_lng: lng,
      })
      .eq('id', openLog.id)
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to check out');
    return data;
  }

  async getActiveCheckIn(userId) {
    const { data } = await supabaseAdmin
      .from('attendance_logs')
      .select('*, project:projects (id, project_number, title)')
      .eq('user_id', userId)
      .is('check_out_at', null)
      .single();

    return data || null;
  }

  async listByProject(projectId, organizationId, { page = 1, limit = 25 } = {}) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('attendance_logs')
      .select('*, user:profiles!attendance_logs_user_id_fkey (id, full_name)', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('check_in_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError(500, 'Failed to fetch attendance logs');
    return { data, total: count, page, limit };
  }
}
