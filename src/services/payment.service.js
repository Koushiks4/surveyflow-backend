import { supabaseAdmin } from '../lib/supabase.js';
import { AppError } from '../utils/errors.js';

export class PaymentService {
  async listByProject(projectId, organizationId) {
    const { data, error } = await supabaseAdmin
      .from('payment_entries')
      .select(`
        *,
        category:expense_categories (id, name),
        created_by_user:profiles!payment_entries_created_by_fkey (id, full_name)
      `)
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (error) throw new AppError(500, 'Failed to fetch payment entries');
    return data;
  }

  async create(organizationId, userId, body) {
    const insert = {
      organization_id: organizationId,
      project_id: body.projectId,
      type: body.type,
      amount: body.amount,
      category_id: body.categoryId || null,
      description: body.description || null,
      payment_method: body.paymentMethod || null,
      date: body.date,
      created_by: userId,
    };

    if (body.receipt) {
      if (/[^a-zA-Z0-9._-]/.test(body.receipt.filename)) {
        throw new AppError(400, 'Receipt file name contains invalid characters. Please rename using only letters, numbers, dots, hyphens, and underscores.');
      }
      const buffer = await body.receipt.toBuffer();
      const filePath = `${organizationId}/receipts/${body.projectId}/${Date.now()}-${body.receipt.filename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(filePath, buffer, { contentType: body.receipt.mimetype || 'application/octet-stream' });

      if (uploadError) throw new AppError(500, 'Failed to upload receipt');

      insert.receipt_path = filePath;
      insert.receipt_name = body.receipt.filename;
      insert.receipt_size = buffer.length;
    }

    const { data, error } = await supabaseAdmin
      .from('payment_entries')
      .insert(insert)
      .select(`
        *,
        category:expense_categories (id, name),
        created_by_user:profiles!payment_entries_created_by_fkey (id, full_name)
      `)
      .single();

    if (error) throw new AppError(500, 'Failed to create payment entry');
    return data;
  }

  async update(id, organizationId, body) {
    const updates = {};
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.categoryId !== undefined) updates.category_id = body.categoryId || null;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.paymentMethod !== undefined) updates.payment_method = body.paymentMethod || null;
    if (body.date !== undefined) updates.date = body.date;

    const { data, error } = await supabaseAdmin
      .from('payment_entries')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        category:expense_categories (id, name),
        created_by_user:profiles!payment_entries_created_by_fkey (id, full_name)
      `)
      .single();

    if (error) throw new AppError(500, 'Failed to update payment entry');
    if (!data) throw new AppError(404, 'Payment entry not found');
    return data;
  }

  async delete(id, organizationId) {
    const { data: entry } = await supabaseAdmin
      .from('payment_entries')
      .select('receipt_path')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (!entry) throw new AppError(404, 'Payment entry not found');

    if (entry.receipt_path) {
      await supabaseAdmin.storage.from('documents').remove([entry.receipt_path]);
    }

    await supabaseAdmin.from('payment_entries').delete().eq('id', id);
  }

  async getProjectSummary(projectId, organizationId) {
    const { data: quote } = await supabaseAdmin
      .from('project_quotes')
      .select('quoted_amount')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .single();

    const { data: entries } = await supabaseAdmin
      .from('payment_entries')
      .select('type, amount')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId);

    const quoted = parseFloat(quote?.quoted_amount || '0');
    const advances = (entries || [])
      .filter(e => e.type === 'advance')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const expenses = (entries || [])
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    return {
      quoted,
      advances,
      expenses,
      balance: quoted - advances,
      profit: advances - expenses,
    };
  }

  async setQuote(projectId, organizationId, userId, quotedAmount) {
    const { data: existing } = await supabaseAdmin
      .from('project_quotes')
      .select('id')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('project_quotes')
        .update({ quoted_amount: quotedAmount, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new AppError(500, 'Failed to update quote');
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from('project_quotes')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        quoted_amount: quotedAmount,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) throw new AppError(500, 'Failed to set quote');
    return data;
  }

  async getMonthlyReport(organizationId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const { data: entries } = await supabaseAdmin
      .from('payment_entries')
      .select(`
        project_id, type, amount,
        project:projects (id, project_number, title, client:clients (name))
      `)
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lt('date', endDate);

    const { data: quotes } = await supabaseAdmin
      .from('project_quotes')
      .select('project_id, quoted_amount')
      .eq('organization_id', organizationId);

    const quoteMap = Object.fromEntries((quotes || []).map(q => [q.project_id, parseFloat(q.quoted_amount)]));

    const projectMap = new Map();
    for (const entry of entries || []) {
      const pid = entry.project_id;
      if (!projectMap.has(pid)) {
        projectMap.set(pid, {
          project_id: pid,
          project_number: entry.project?.project_number,
          title: entry.project?.title,
          client_name: entry.project?.client?.name,
          quoted: quoteMap[pid] || 0,
          advances: 0,
          expenses: 0,
        });
      }
      const row = projectMap.get(pid);
      const amount = parseFloat(entry.amount);
      if (entry.type === 'advance') row.advances += amount;
      else row.expenses += amount;
    }

    const projects = Array.from(projectMap.values()).map(p => ({
      ...p,
      balance: p.quoted - p.advances,
      profit: p.advances - p.expenses,
    }));

    const totals = projects.reduce(
      (acc, p) => ({
        quoted: acc.quoted + p.quoted,
        advances: acc.advances + p.advances,
        expenses: acc.expenses + p.expenses,
        balance: acc.balance + p.balance,
        profit: acc.profit + p.profit,
      }),
      { quoted: 0, advances: 0, expenses: 0, balance: 0, profit: 0 }
    );

    return { projects, totals };
  }

  async getReceiptUrl(entryId, organizationId) {
    const { data: entry } = await supabaseAdmin
      .from('payment_entries')
      .select('receipt_path')
      .eq('id', entryId)
      .eq('organization_id', organizationId)
      .single();

    if (!entry?.receipt_path) throw new AppError(404, 'Receipt not found');

    const { data } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(entry.receipt_path, 3600);

    return { url: data.signedUrl };
  }
}
