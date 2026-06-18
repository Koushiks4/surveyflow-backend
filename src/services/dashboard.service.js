import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class DashboardService {
  async getStats(organizationId, userId, roles) {
    const isAdmin = roles.some(r => ['super_admin', 'admin'].includes(r));

    const [projects, clients, statuses] = await Promise.all([
      this.getProjectStats(organizationId, isAdmin ? null : userId),
      this.getClientCount(organizationId),
      this.getStatusBreakdown(organizationId, isAdmin ? null : userId),
    ]);

    return { projects, clients, statuses };
  }

  async getProjectStats(organizationId, userId) {
    let query = supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (userId) {
      const { data: assignedProjectIds } = await supabaseAdmin
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', userId);

      const ids = assignedProjectIds?.map(a => a.project_id) || [];
      if (ids.length === 0) return { total: 0, thisMonth: 0 };
      query = query.in('id', ids);
    }

    const { count: total } = await query;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let monthQuery = supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString());

    const { count: thisMonth } = await monthQuery;

    return { total, thisMonth };
  }

  async getClientCount(organizationId) {
    const { count } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId);

    return { total: count };
  }

  async getStatusBreakdown(organizationId, userId) {
    const { data: statuses } = await supabaseAdmin
      .from('project_statuses')
      .select('id, name, color')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('display_order');

    if (!statuses || statuses.length === 0) return [];

    const breakdown = await Promise.all(
      statuses.map(async (status) => {
        let query = supabaseAdmin
          .from('projects')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .eq('status_id', status.id);

        const { count } = await query;
        return { ...status, count };
      })
    );

    return breakdown;
  }

  async getDeliveryTracker(organizationId) {
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select(`
        id, project_number, title, delivery_confirmed_at,
        client:clients (name),
        status:project_statuses (name, color)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (!projects) return { pending: [], delivered: [], closed: [] };

    const results = [];
    for (const project of projects) {
      const statusName = project.status?.name?.toLowerCase() || '';
      if (statusName === 'closed') continue;

      const { data: deliverables } = await supabaseAdmin
        .from('project_deliverables')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id);

      const { data: checklistItems } = await supabaseAdmin
        .from('closure_checklist_items')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const { data: checks } = await supabaseAdmin
        .from('project_closure_checks')
        .select('id')
        .eq('project_id', project.id)
        .eq('checked', true);

      const totalChecklist = checklistItems?.length || 0;
      const completedChecklist = checks?.length || 0;

      results.push({
        id: project.id,
        project_number: project.project_number,
        title: project.title,
        client_name: project.client?.name,
        status: project.status,
        deliverables_count: deliverables || 0,
        checklist_total: totalChecklist,
        checklist_completed: completedChecklist,
        delivery_confirmed: !!project.delivery_confirmed_at,
      });
    }

    const pending = results.filter(p => !p.delivery_confirmed && p.status?.name !== 'Delivered');
    const delivered = results.filter(p => p.delivery_confirmed || p.status?.name === 'Delivered');

    return { pending, delivered };
  }

  async getRecentProjects(organizationId, userId, roles, limit = 10) {
    const isAdmin = roles.some(r => ['super_admin', 'admin'].includes(r));

    let query = supabaseAdmin
      .from('projects')
      .select(`
        id, project_number, title, created_at,
        client:clients (name),
        status:project_statuses (name, color)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!isAdmin) {
      const { data: assignments } = await supabaseAdmin
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', userId);

      const ids = assignments?.map(a => a.project_id) || [];
      if (ids.length === 0) return [];
      query = query.in('id', ids);
    }

    const { data } = await query;
    return data || [];
  }
}
