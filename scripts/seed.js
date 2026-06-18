#!/usr/bin/env node

/**
 * Seed script for SurveyFlow test data.
 *
 * Usage:
 *   node scripts/seed.js          # seed fresh data
 *   node scripts/seed.js --clean  # wipe all data first, then seed
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CLEAN = process.argv.includes('--clean');
const TEST_PASSWORD = 'Test@1234';

async function clean() {
  console.log('🧹 Cleaning existing data...');
  await supabase.from('project_closure_checks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_deliverables').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('closure_checklist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('payment_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('task_files').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('expense_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('project_types').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  for (const user of authUsers?.users || []) {
    await supabase.auth.admin.deleteUser(user.id);
  }
  console.log('   Done.\n');
}

async function seed() {
  console.log('🌱 Seeding SurveyFlow test data...\n');

  // 1. Organization
  console.log('  Creating organization...');
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: 'Sathyananda Surveys', slug: 'sathyananda-surveys', project_id_prefix: 'SAT' })
    .select()
    .single();
  console.log(`   ✓ Organization: ${org.name} (${org.id})`);

  // 2. Roles lookup
  const { data: roles } = await supabase.from('roles').select('*');
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  // 3. Users
  console.log('  Creating users...');
  const userDefs = [
    { fullName: 'Rajesh Kumar', email: 'rajesh@sathyananda.com', roles: ['super_admin'] },
    { fullName: 'Priya Sharma', email: 'priya@sathyananda.com', roles: ['admin'] },
    { fullName: 'Suresh Reddy', email: 'suresh@sathyananda.com', roles: ['team_lead'] },
    { fullName: 'Vikram Singh', email: 'vikram@sathyananda.com', roles: ['surveyor'] },
    { fullName: 'Anita Desai', email: 'anita@sathyananda.com', roles: ['office_staff'] },
    { fullName: 'Ravi Patel', email: 'ravi@sathyananda.com', roles: ['autocad_employee'] },
    { fullName: 'Meera Nair', email: 'meera@sathyananda.com', roles: ['surveyor', 'office_staff'] },
  ];

  const users = {};
  for (const def of userDefs) {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: def.email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (authErr) { console.error(`   ✗ ${def.email}: ${authErr.message}`); continue; }

    await supabase.from('profiles').insert({
      id: authUser.user.id,
      organization_id: org.id,
      full_name: def.fullName,
      email: def.email,
      phone: '+91 98765 ' + String(Math.floor(10000 + Math.random() * 90000)),
    });

    for (const roleName of def.roles) {
      await supabase.from('user_roles').insert({ user_id: authUser.user.id, role_id: roleMap[roleName] });
    }

    users[def.email] = authUser.user.id;
    console.log(`   ✓ ${def.fullName} (${def.email}) — ${def.roles.join(', ')}`);
  }

  // 4. Deactivate Ravi
  await supabase.from('profiles').update({ is_active: false }).eq('id', users['ravi@sathyananda.com']);
  console.log('   ✓ Ravi Patel deactivated');

  // 5. Config — Project Types
  console.log('  Creating configuration...');
  const typeNames = ['Land Survey', 'Building Survey', 'Topographical Survey', 'Drone Survey'];
  const { data: projectTypes } = await supabase
    .from('project_types')
    .insert(typeNames.map(name => ({ name, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${projectTypes.length} project types`);

  // 6. Config — Project Statuses
  const statusDefs = [
    { name: 'Pending', color: '#F59E0B', display_order: 0, is_default: true },
    { name: 'In Progress', color: '#3B82F6', display_order: 1 },
    { name: 'Completed', color: '#10B981', display_order: 2 },
    { name: 'On Hold', color: '#6B7280', display_order: 3 },
    { name: 'Delivered', color: '#8B5CF6', display_order: 4 },
    { name: 'Closed', color: '#64748B', display_order: 5 },
  ];
  const { data: projectStatuses } = await supabase
    .from('project_statuses')
    .insert(statusDefs.map(s => ({ ...s, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${projectStatuses.length} project statuses`);

  const statusMap = Object.fromEntries(projectStatuses.map(s => [s.name, s.id]));

  // 7. Config — Expense Categories
  const expenseNames = ['Survey Cost', 'Staff Cost', 'Travel', 'Equipment Rental', 'Others'];
  const { data: expenses } = await supabase
    .from('expense_categories')
    .insert(expenseNames.map(name => ({ name, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${expenses.length} expense categories`);

  // 8. Clients
  console.log('  Creating clients...');
  const clientDefs = [
    { name: 'Ramesh Construction Pvt Ltd', mobile: '+91 98765 11111', email: 'ramesh@construction.com', address: 'MG Road, Bangalore', location_lat: 12.9716, location_lng: 77.5946, location_address: 'MG Road, Bengaluru, Karnataka', notes: 'Regular client, handles large commercial projects' },
    { name: 'Green Valley Developers', mobile: '+91 98765 22222', email: 'info@greenvalley.com', address: 'Whitefield, Bangalore', location_lat: 12.9698, location_lng: 77.7500, location_address: 'Whitefield, Bengaluru, Karnataka' },
    { name: 'Lakshmi Housing', mobile: '+91 98765 33333', email: 'lakshmi@housing.com' },
  ];
  const { data: clients } = await supabase
    .from('clients')
    .insert(clientDefs.map(c => ({ ...c, organization_id: org.id, created_by: users['rajesh@sathyananda.com'] })))
    .select();
  console.log(`   ✓ ${clients.length} clients`);

  // 9. Projects
  console.log('  Creating projects...');
  const projectDefs = [
    { title: 'Commercial Plot Survey - MG Road', client: clients[0], type: projectTypes[0], status: 'In Progress', description: 'Complete land survey for new commercial building plot', start_date: '2026-06-01', expected_end_date: '2026-07-01' },
    { title: 'Residential Complex Survey', client: clients[1], type: projectTypes[1], status: 'Pending', description: 'Survey for 50-unit residential complex', start_date: '2026-06-15', expected_end_date: '2026-08-15' },
    { title: 'Topographical Mapping - North Site', client: clients[0], type: projectTypes[2], status: 'Pending', description: 'Topographical mapping for proposed road expansion' },
    { title: 'Drone Survey - Industrial Zone', client: clients[2], type: projectTypes[3], status: 'Completed', description: 'Aerial drone survey of industrial zone', start_date: '2026-05-01', expected_end_date: '2026-05-30', actual_end_date: '2026-05-28' },
  ];

  const projects = [];
  for (let i = 0; i < projectDefs.length; i++) {
    const def = projectDefs[i];
    const { data: projectNumber } = await supabase.rpc('generate_project_number', { org_id: org.id });

    const { data: project } = await supabase
      .from('projects')
      .insert({
        organization_id: org.id,
        project_number: projectNumber,
        client_id: def.client.id,
        project_type_id: def.type.id,
        status_id: statusMap[def.status],
        title: def.title,
        description: def.description,
        location_lat: def.client.location_lat,
        location_lng: def.client.location_lng,
        location_address: def.client.location_address,
        start_date: def.start_date || null,
        expected_end_date: def.expected_end_date || null,
        actual_end_date: def.actual_end_date || null,
        created_by: users['rajesh@sathyananda.com'],
      })
      .select()
      .single();

    projects.push(project);
    console.log(`   ✓ ${project.project_number}: ${project.title}`);
  }

  // 10. Project Assignments
  console.log('  Creating assignments...');
  const assignmentDefs = [
    { project: projects[0], user: 'suresh@sathyananda.com', role: 'team_lead' },
    { project: projects[0], user: 'vikram@sathyananda.com', role: 'surveyor' },
    { project: projects[0], user: 'anita@sathyananda.com', role: 'office_staff' },
    { project: projects[1], user: 'suresh@sathyananda.com', role: 'team_lead' },
    { project: projects[1], user: 'meera@sathyananda.com', role: 'surveyor' },
    { project: projects[2], user: 'vikram@sathyananda.com', role: 'surveyor' },
    { project: projects[3], user: 'suresh@sathyananda.com', role: 'team_lead' },
    { project: projects[3], user: 'vikram@sathyananda.com', role: 'surveyor' },
    { project: projects[3], user: 'ravi@sathyananda.com', role: 'autocad_employee' },
  ];

  for (const a of assignmentDefs) {
    await supabase.from('project_assignments').insert({
      project_id: a.project.id,
      user_id: users[a.user],
      role_id: roleMap[a.role],
      assigned_by: users['rajesh@sathyananda.com'],
    });
  }
  console.log(`   ✓ ${assignmentDefs.length} assignments`);

  // 11. Project Tasks
  console.log('  Creating tasks...');
  const taskDefs = [
    { project: projects[0], title: 'Initial site inspection', description: 'Inspect the site boundaries and note landmarks', assigned_to: users['vikram@sathyananda.com'], status: 'completed', due_date: '2026-06-05' },
    { project: projects[0], title: 'Boundary measurements', description: 'Take precise boundary measurements using total station', assigned_to: users['vikram@sathyananda.com'], status: 'in_progress', due_date: '2026-06-20' },
    { project: projects[0], title: 'Prepare draft report', description: 'Compile field data into preliminary report', assigned_to: users['anita@sathyananda.com'], status: 'pending', due_date: '2026-06-25' },
    { project: projects[1], title: 'Site visit and photography', assigned_to: users['meera@sathyananda.com'], status: 'pending', due_date: '2026-06-20' },
    { project: projects[1], title: 'Ground level measurements', assigned_to: users['meera@sathyananda.com'], status: 'pending', due_date: '2026-07-01' },
  ];

  for (const t of taskDefs) {
    const insert = {
      organization_id: org.id,
      project_id: t.project.id,
      title: t.title,
      description: t.description || null,
      assigned_to: t.assigned_to,
      status: t.status,
      due_date: t.due_date || null,
      created_by: users['suresh@sathyananda.com'],
    };
    if (t.status === 'completed') insert.completed_at = new Date().toISOString();
    await supabase.from('project_tasks').insert(insert);
  }
  console.log(`   ✓ ${taskDefs.length} tasks`);

  // 12. Project Notes
  console.log('  Creating notes...');
  const noteDefs = [
    { project: projects[0], user: 'suresh@sathyananda.com', content: 'Client confirmed access to the site from the east gate. Security will be informed.' },
    { project: projects[0], user: 'vikram@sathyananda.com', content: 'Site visit completed. Found existing boundary markers on the north side. Need to verify south boundary with revenue records.' },
    { project: projects[0], user: 'anita@sathyananda.com', content: 'Revenue department records received. Forwarding to survey team.' },
    { project: projects[1], user: 'suresh@sathyananda.com', content: 'Project kickoff meeting scheduled for next Monday with the client.' },
    { project: projects[1], user: 'meera@sathyananda.com', content: 'Awaiting client confirmation for site access dates.' },
  ];

  for (const n of noteDefs) {
    await supabase.from('project_notes').insert({
      organization_id: org.id,
      project_id: n.project.id,
      user_id: users[n.user],
      content: n.content,
    });
  }
  console.log(`   ✓ ${noteDefs.length} notes`);

  // 13. Attendance Logs
  console.log('  Creating attendance logs...');
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);

  const attendanceDefs = [
    { project: projects[0], user: 'vikram@sathyananda.com', checkIn: new Date(twoDaysAgo.setHours(9, 0, 0)), checkOut: new Date(twoDaysAgo.setHours(17, 30, 0)), lat: 12.9716, lng: 77.5946 },
    { project: projects[0], user: 'vikram@sathyananda.com', checkIn: new Date(yesterday.setHours(8, 45, 0)), checkOut: new Date(yesterday.setHours(16, 15, 0)), lat: 12.9720, lng: 77.5950 },
    { project: projects[0], user: 'anita@sathyananda.com', checkIn: new Date(yesterday.setHours(10, 0, 0)), checkOut: new Date(yesterday.setHours(14, 0, 0)), lat: 12.9718, lng: 77.5948 },
  ];

  for (const a of attendanceDefs) {
    await supabase.from('attendance_logs').insert({
      organization_id: org.id,
      project_id: a.project.id,
      user_id: users[a.user],
      check_in_at: a.checkIn.toISOString(),
      check_in_lat: a.lat,
      check_in_lng: a.lng,
      check_out_at: a.checkOut.toISOString(),
      check_out_lat: a.lat + 0.001,
      check_out_lng: a.lng + 0.001,
    });
  }
  console.log(`   ✓ ${attendanceDefs.length} attendance logs`);

  // 14. Project Quotes
  console.log('  Creating payment data...');
  const quoteDefs = [
    { project: projects[0], amount: 250000 },
    { project: projects[1], amount: 500000 },
    { project: projects[3], amount: 150000 },
  ];

  for (const q of quoteDefs) {
    await supabase.from('project_quotes').insert({
      organization_id: org.id,
      project_id: q.project.id,
      quoted_amount: q.amount,
      updated_by: users['rajesh@sathyananda.com'],
    });
  }
  console.log(`   ✓ ${quoteDefs.length} project quotes`);

  // 15. Payment Entries
  const paymentDefs = [
    { project: projects[0], type: 'advance', amount: 100000, method: 'bank_transfer', date: '2026-06-01', desc: 'Initial advance payment' },
    { project: projects[0], type: 'expense', amount: 15000, category: 'Survey Cost', method: 'cash', date: '2026-06-03', desc: 'Equipment rental for total station' },
    { project: projects[0], type: 'expense', amount: 5000, category: 'Travel', method: 'upi', date: '2026-06-05', desc: 'Travel to site and back' },
    { project: projects[0], type: 'expense', amount: 8000, category: 'Staff Cost', method: 'bank_transfer', date: '2026-06-10', desc: 'Field assistant wages' },
    { project: projects[1], type: 'advance', amount: 200000, method: 'cheque', date: '2026-06-15', desc: 'First installment' },
    { project: projects[1], type: 'expense', amount: 25000, category: 'Survey Cost', method: 'bank_transfer', date: '2026-06-16', desc: 'Drone survey charges' },
    { project: projects[3], type: 'advance', amount: 150000, method: 'bank_transfer', date: '2026-05-01', desc: 'Full payment received' },
    { project: projects[3], type: 'expense', amount: 30000, category: 'Survey Cost', method: 'cash', date: '2026-05-05', desc: 'Drone rental and operator' },
    { project: projects[3], type: 'expense', amount: 10000, category: 'Staff Cost', method: 'upi', date: '2026-05-10', desc: 'Data processing charges' },
    { project: projects[3], type: 'expense', amount: 5000, category: 'Travel', method: 'cash', date: '2026-05-12', desc: 'Site travel expenses' },
  ];

  for (const p of paymentDefs) {
    const categoryId = p.category ? expenses.find(e => e.name === p.category)?.id : null;
    await supabase.from('payment_entries').insert({
      organization_id: org.id,
      project_id: p.project.id,
      type: p.type,
      amount: p.amount,
      category_id: categoryId,
      description: p.desc,
      payment_method: p.method,
      date: p.date,
      created_by: users['rajesh@sathyananda.com'],
    });
  }
  console.log(`   ✓ ${paymentDefs.length} payment entries`);

  // 16. Closure Checklist Items
  console.log('  Creating closure checklist...');
  const checklistDefs = [
    { title: 'Final report uploaded', display_order: 0 },
    { title: 'All deliverables uploaded', display_order: 1 },
    { title: 'All payments received', display_order: 2 },
    { title: 'Client confirmed delivery', display_order: 3 },
  ];

  const { data: checklistItems } = await supabase
    .from('closure_checklist_items')
    .insert(checklistDefs.map(c => ({ ...c, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${checklistItems.length} checklist items`);

  // Summary
  console.log('\n✅ Seed complete!\n');
  console.log('📋 Summary:');
  console.log(`   Organization: ${org.name} (${org.slug})`);
  console.log(`   Users: ${Object.keys(users).length} (password: ${TEST_PASSWORD})`);
  console.log(`   Clients: ${clients.length}`);
  console.log(`   Projects: ${projects.length} (${projects.map(p => p.project_number).join(', ')})`);
  console.log(`   Tasks: ${taskDefs.length}`);
  console.log(`   Notes: ${noteDefs.length}`);
  console.log(`   Attendance logs: ${attendanceDefs.length}`);
  console.log(`   Quotes: ${quoteDefs.length}`);
  console.log(`   Payment entries: ${paymentDefs.length}`);
  console.log('\n🔑 Login credentials:');
  for (const def of userDefs) {
    console.log(`   ${def.email} / ${TEST_PASSWORD} (${def.roles.join(', ')})`);
  }
}

async function main() {
  try {
    if (CLEAN) await clean();
    await seed();
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

main();
