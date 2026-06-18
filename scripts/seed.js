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
  await supabase.from('project_delivery_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
  console.log('🌱 Seeding SurveyFlow demo data (Bangalore context)...\n');

  // 1. Organization
  console.log('  Creating organization...');
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: 'Global Consultants', slug: 'global-consultants', project_id_prefix: 'GC' })
    .select()
    .single();
  console.log(`   ✓ Organization: ${org.name} (${org.id})`);

  // 2. Roles lookup
  const { data: roles } = await supabase.from('roles').select('*');
  const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

  // 3. Users
  console.log('  Creating users...');
  const userDefs = [
    { fullName: 'Rajesh Kumar', email: 'rajesh@globalconsultants.com', phone: '+91 98765 43210', roles: ['super_admin'] },
    { fullName: 'Priya Sharma', email: 'priya@globalconsultants.com', phone: '+91 98765 43211', roles: ['admin'] },
    { fullName: 'Suresh Reddy', email: 'suresh@globalconsultants.com', phone: '+91 98765 43212', roles: ['team_lead'] },
    { fullName: 'Vikram Singh', email: 'vikram@globalconsultants.com', phone: '+91 98765 43213', roles: ['surveyor'] },
    { fullName: 'Anita Desai', email: 'anita@globalconsultants.com', phone: '+91 98765 43214', roles: ['office_staff'] },
    { fullName: 'Ravi Patel', email: 'ravi@globalconsultants.com', phone: '+91 98765 43215', roles: ['autocad_employee'] },
    { fullName: 'Meera Nair', email: 'meera@globalconsultants.com', phone: '+91 98765 43216', roles: ['surveyor', 'office_staff'] },
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
      phone: def.phone,
    });

    for (const roleName of def.roles) {
      await supabase.from('user_roles').insert({ user_id: authUser.user.id, role_id: roleMap[roleName] });
    }

    users[def.email] = authUser.user.id;
    console.log(`   ✓ ${def.fullName} (${def.email}) — ${def.roles.join(', ')}`);
  }

  // 4. Deactivate Ravi
  await supabase.from('profiles').update({ is_active: false }).eq('id', users['ravi@globalconsultants.com']);
  console.log('   ✓ Ravi Patel deactivated');

  // 5. Config — Project Types (Bangalore survey industry)
  console.log('  Creating configuration...');
  const typeNames = ['Land Survey', 'Building Survey', 'Topographical Survey', 'Route Survey', 'DGPS Survey', 'Drone Survey'];
  const { data: projectTypes } = await supabase
    .from('project_types')
    .insert(typeNames.map(name => ({ name, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${projectTypes.length} project types`);
  const typeMap = Object.fromEntries(projectTypes.map(t => [t.name, t]));

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

  // 7. Config — Expense Categories (survey-specific)
  const expenseNames = ['Survey Equipment', 'Staff Wages', 'Travel & Transport', 'DGPS/Instrument Rental', 'Government Fees', 'Vehicle & Fuel', 'Others'];
  const { data: expenses } = await supabase
    .from('expense_categories')
    .insert(expenseNames.map(name => ({ name, organization_id: org.id })))
    .select();
  console.log(`   ✓ ${expenses.length} expense categories`);

  // 8. Clients (diverse Bangalore client types)
  console.log('  Creating clients...');
  const clientDefs = [
    {
      name: 'Prestige Estates Pvt Ltd',
      mobile: '+91 80 4094 4094',
      email: 'projects@prestigegroup.com',
      address: 'Prestige Falcon Tower, Brunton Road, Bengaluru 560025',
      location_lat: 12.9716, location_lng: 77.6100,
      location_address: 'Brunton Road, Ashok Nagar, Bengaluru',
      notes: 'Major real estate developer. Multiple ongoing projects. Point of contact: Mr. Deepak - Land Acquisition Dept.',
    },
    {
      name: 'Karnataka State Housing Board',
      mobile: '+91 80 2238 1037',
      email: 'housing.board@karnataka.gov.in',
      address: 'Cauvery Bhavan, KG Road, Bengaluru 560009',
      location_lat: 12.9767, location_lng: 77.5713,
      location_address: 'KG Road, Majestic, Bengaluru',
      notes: 'Government agency. Requires proper invoicing with GST. Payment cycle: 45-60 days after delivery.',
    },
    {
      name: 'Adarsh Developers',
      mobile: '+91 98450 12345',
      email: 'land@adarshdevelopers.com',
      address: 'Adarsh Palm Retreat, Sarjapur Road, Bengaluru 560035',
      location_lat: 12.9081, location_lng: 77.6890,
      location_address: 'Sarjapur Road, Bellandur, Bengaluru',
      notes: 'Premium villa developer. Needs frequent boundary surveys for new phases.',
    },
    {
      name: 'Mr. Venkatesh Gowda',
      mobile: '+91 99001 54321',
      email: 'venkateshg@gmail.com',
      address: 'Sy. No. 45/2, Sadahalli Village, Devanahalli Taluk',
      location_lat: 13.2461, location_lng: 77.7126,
      location_address: 'Sadahalli Village, Devanahalli, Bengaluru Rural',
      notes: 'NRI property owner (based in Dubai). Inherited agricultural land near airport. Needs boundary verification before sale.',
    },
    {
      name: 'Namma Metro (BMRCL)',
      mobile: '+91 80 2296 9200',
      email: 'landacq@bmrc.co.in',
      address: 'BMRCL Head Office, III Floor, BMTC Complex, Shanthinagar, Bengaluru 560027',
      location_lat: 12.9554, location_lng: 77.5950,
      location_address: 'Shanthinagar, Bengaluru',
      notes: 'Bangalore Metro Rail Corporation. Phase 3 alignment surveys. High-accuracy DGPS required. Government rates apply.',
    },
    {
      name: 'Sobha Limited',
      mobile: '+91 80 4930 5555',
      email: 'projects@sobha.com',
      address: 'Sobha Quartz, Bannerghatta Road, Bengaluru 560076',
      location_lat: 12.8862, location_lng: 77.5969,
      location_address: 'Bannerghatta Road, JP Nagar, Bengaluru',
      notes: 'Premium developer. Contour survey requirements for hillside projects.',
    },
    {
      name: 'Sri Lakshmi Constructions',
      mobile: '+91 97315 67890',
      email: 'srilakshmiconstructions@yahoo.com',
      address: '14th Cross, Kanakapura Road, Bengaluru 560062',
      location_lat: 12.8970, location_lng: 77.5740,
      location_address: 'Kanakapura Road, Banashankari, Bengaluru',
      notes: 'Small builder. Residential plot development. Budget-conscious, prefers quick turnaround.',
    },
    {
      name: 'Mr. Rajan Hegde (Advocate)',
      mobile: '+91 94480 11223',
      email: 'advocate.rajan@gmail.com',
      address: 'Court Complex, Yelahanka, Bengaluru 560064',
      location_lat: 13.1007, location_lng: 77.5963,
      location_address: 'Yelahanka, Bengaluru',
      notes: 'Property lawyer. Sends court-ordered survey cases. Payment on case completion. Currently handling partition suit for 3-acre property.',
    },
  ];
  const { data: clients } = await supabase
    .from('clients')
    .insert(clientDefs.map(c => ({ ...c, organization_id: org.id, created_by: users['anita@globalconsultants.com'] })))
    .select();
  console.log(`   ✓ ${clients.length} clients`);

  const clientMap = Object.fromEntries(clients.map(c => [c.name, c]));

  // 9. Projects (8 projects covering different survey types and statuses)
  console.log('  Creating projects...');
  const projectDefs = [
    {
      title: 'Prestige Lakeside Habitat - Boundary Survey',
      client: 'Prestige Estates Pvt Ltd',
      type: 'Land Survey',
      status: 'In Progress',
      description: 'Complete boundary demarcation survey for 15-acre residential project site in Whitefield. Verify all 4 boundaries against Tippan records from DSSLR. Mark boundary stones (Kallu Gundu) at all corners.',
      location_lat: 12.9698, location_lng: 77.7500,
      location_address: 'Whitefield, Bengaluru',
      start_date: '2026-06-01',
      expected_end_date: '2026-07-15',
    },
    {
      title: 'BDA Layout Formation - Nadaprabhu Kempegowda Layout',
      client: 'Karnataka State Housing Board',
      type: 'Topographical Survey',
      status: 'In Progress',
      description: 'Topographic and contour survey for proposed BDA layout formation. 200-acre site near Devanahalli. Contour interval: 0.5m. Include DTM/DEM for drainage design. Coordinate with BDA layout planning team.',
      location_lat: 13.2350, location_lng: 77.7100,
      location_address: 'Near Devanahalli, Bengaluru Rural',
      start_date: '2026-05-15',
      expected_end_date: '2026-08-30',
    },
    {
      title: 'Adarsh Palm Retreat Phase 2 - Building Survey',
      client: 'Adarsh Developers',
      type: 'Building Survey',
      status: 'Pending',
      description: 'Construction staking and setback verification survey for Phase 2 of Palm Retreat villa project. 45 villa plots. BBMP building plan approval requires setback verification report.',
      location_lat: 12.9081, location_lng: 77.6890,
      location_address: 'Sarjapur Road, Bellandur, Bengaluru',
      start_date: '2026-07-01',
      expected_end_date: '2026-08-15',
    },
    {
      title: 'Revenue Site Boundary Verification - Sy. No. 45/2',
      client: 'Mr. Venkatesh Gowda',
      type: 'Land Survey',
      status: 'Completed',
      description: 'Boundary verification of 2.5-acre agricultural land (Sy. No. 45/2, Sadahalli Village). NRI owner needs survey before sale. Cross-verify with Pahani/RTC from Bhoomi portal. Check for Rajakaluve encroachment on eastern side.',
      location_lat: 13.2461, location_lng: 77.7126,
      location_address: 'Sadahalli Village, Devanahalli Taluk',
      start_date: '2026-05-10',
      expected_end_date: '2026-05-25',
      actual_end_date: '2026-05-22',
    },
    {
      title: 'Namma Metro Phase 3 - ORR Corridor Alignment Survey',
      client: 'Namma Metro (BMRCL)',
      type: 'Route Survey',
      status: 'In Progress',
      description: 'Route alignment survey for Metro Phase 3 along Outer Ring Road from Silk Board to KR Puram. 18km stretch. DGPS control points every 500m. Cross-section surveys at 50m intervals. Identify structures within 30m corridor.',
      location_lat: 12.9172, location_lng: 77.6230,
      location_address: 'ORR, Silk Board Junction to KR Puram, Bengaluru',
      start_date: '2026-04-01',
      expected_end_date: '2026-09-30',
    },
    {
      title: 'Sobha Dream Acres - Contour & Topo Survey',
      client: 'Sobha Limited',
      type: 'Topographical Survey',
      status: 'Pending',
      description: 'Contour survey for 30-acre hillside residential project. 0.25m contour interval. Include existing trees, rock outcrops, and natural drainage channels. Data needed for architect site planning.',
      location_lat: 12.8862, location_lng: 77.5969,
      location_address: 'Off Bannerghatta Road, Bengaluru',
      start_date: '2026-07-10',
      expected_end_date: '2026-08-20',
    },
    {
      title: 'Residential Plot Layout - Kanakapura Road',
      client: 'Sri Lakshmi Constructions',
      type: 'Land Survey',
      status: 'On Hold',
      description: 'Layout survey for 40-site residential plot development. DC conversion pending from Tahsildar office. Survey to resume once DC conversion order is received. BBMP zone: RR Nagar.',
      location_lat: 12.8970, location_lng: 77.5740,
      location_address: 'Kanakapura Road, Uttarahalli, Bengaluru',
      start_date: '2026-05-20',
      expected_end_date: '2026-07-30',
    },
    {
      title: 'Court-Ordered Property Partition Survey - Sy. No. 112',
      client: 'Mr. Rajan Hegde (Advocate)',
      type: 'DGPS Survey',
      status: 'Delivered',
      description: 'Court-appointed Commissioner survey for partition of 3-acre ancestral property (Sy. No. 112, Yelahanka Hobli). 4-way partition among legal heirs. DGPS accuracy required for court submission. Include area computation statement.',
      location_lat: 13.1007, location_lng: 77.5963,
      location_address: 'Yelahanka Hobli, Bengaluru North',
      start_date: '2026-04-15',
      expected_end_date: '2026-05-15',
      actual_end_date: '2026-05-10',
    },
  ];

  const projects = [];
  for (const def of projectDefs) {
    const { data: projectNumber } = await supabase.rpc('generate_project_number', { org_id: org.id });

    const { data: project } = await supabase
      .from('projects')
      .insert({
        organization_id: org.id,
        project_number: projectNumber,
        client_id: clientMap[def.client].id,
        project_type_id: typeMap[def.type].id,
        status_id: statusMap[def.status],
        title: def.title,
        description: def.description,
        location_lat: def.location_lat,
        location_lng: def.location_lng,
        location_address: def.location_address,
        start_date: def.start_date || null,
        expected_end_date: def.expected_end_date || null,
        actual_end_date: def.actual_end_date || null,
        created_by: users['rajesh@globalconsultants.com'],
      })
      .select()
      .single();

    projects.push(project);
    console.log(`   ✓ ${project.project_number}: ${project.title}`);
  }

  // 10. Project Assignments
  console.log('  Creating assignments...');
  const assignmentDefs = [
    // SAT-2026-0001: Prestige Boundary Survey
    { project: projects[0], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[0], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    { project: projects[0], user: 'meera@globalconsultants.com', role: 'surveyor' },
    { project: projects[0], user: 'anita@globalconsultants.com', role: 'office_staff' },
    // SAT-2026-0002: BDA Layout Topo
    { project: projects[1], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[1], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    { project: projects[1], user: 'meera@globalconsultants.com', role: 'surveyor' },
    { project: projects[1], user: 'ravi@globalconsultants.com', role: 'autocad_employee' },
    // SAT-2026-0003: Adarsh Building Survey
    { project: projects[2], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[2], user: 'meera@globalconsultants.com', role: 'surveyor' },
    // SAT-2026-0004: Revenue Site Verification
    { project: projects[3], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[3], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    { project: projects[3], user: 'anita@globalconsultants.com', role: 'office_staff' },
    // SAT-2026-0005: Metro Alignment
    { project: projects[4], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[4], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    { project: projects[4], user: 'meera@globalconsultants.com', role: 'surveyor' },
    { project: projects[4], user: 'ravi@globalconsultants.com', role: 'autocad_employee' },
    { project: projects[4], user: 'anita@globalconsultants.com', role: 'office_staff' },
    // SAT-2026-0006: Sobha Topo
    { project: projects[5], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    // SAT-2026-0007: Kanakapura Road Layout (On Hold)
    { project: projects[6], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[6], user: 'meera@globalconsultants.com', role: 'surveyor' },
    // SAT-2026-0008: Court Survey (Delivered)
    { project: projects[7], user: 'suresh@globalconsultants.com', role: 'team_lead' },
    { project: projects[7], user: 'vikram@globalconsultants.com', role: 'surveyor' },
    { project: projects[7], user: 'ravi@globalconsultants.com', role: 'autocad_employee' },
  ];

  for (const a of assignmentDefs) {
    await supabase.from('project_assignments').insert({
      project_id: a.project.id,
      user_id: users[a.user],
      role_id: roleMap[a.role],
      assigned_by: users['rajesh@globalconsultants.com'],
    });
  }
  console.log(`   ✓ ${assignmentDefs.length} assignments`);

  // 11. Project Tasks
  console.log('  Creating tasks...');
  const taskDefs = [
    // SAT-2026-0001: Prestige Boundary Survey (In Progress)
    { project: projects[0], title: 'Collect Tippan and RTC from DSSLR office', description: 'Visit DSSLR office in Hoskote to obtain certified Tippan copy for Sy. No. 78/1-5. Also get Pahani/RTC from Bhoomi portal.', assigned_to: users['anita@globalconsultants.com'], status: 'completed', due_date: '2026-06-05' },
    { project: projects[0], title: 'Site reconnaissance and photography', description: 'Initial site visit to identify existing boundary markers, access points, adjacent properties. Take photos of all four sides.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-06-08' },
    { project: projects[0], title: 'Total Station boundary measurements', description: 'Set up control points and measure all boundaries using Total Station. Record coordinates for all corner points and boundary stone positions.', assigned_to: users['vikram@globalconsultants.com'], status: 'in_progress', due_date: '2026-06-25' },
    { project: projects[0], title: 'Verify south boundary with adjacent plot owner', description: 'South boundary disputed by adjacent owner (Sy. No. 78/6). Need joint measurement with village accountant present.', assigned_to: users['meera@globalconsultants.com'], status: 'in_progress', due_date: '2026-06-28' },
    { project: projects[0], title: 'Prepare AutoCAD boundary drawing', description: 'Plot all surveyed coordinates in AutoCAD. Show boundary lines, dimensions, survey numbers, and adjacent property details.', assigned_to: users['vikram@globalconsultants.com'], status: 'pending', due_date: '2026-07-05' },
    { project: projects[0], title: 'Draft survey report with area computation', description: 'Compile field data into survey report. Include area computation, coordinate list, Tippan comparison, and boundary description.', assigned_to: users['anita@globalconsultants.com'], status: 'pending', due_date: '2026-07-10' },

    // SAT-2026-0002: BDA Layout Topo (In Progress)
    { project: projects[1], title: 'Establish DGPS control network', description: 'Set up primary control points across the 200-acre site using DGPS. Minimum 6 control points. Connect to nearest SOI benchmark.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-05-25' },
    { project: projects[1], title: 'Sector A contour survey (0-50 acres)', description: 'Total Station contour survey of Sector A. 0.5m contour interval. Mark all existing structures, trees, and utility lines.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-06-10' },
    { project: projects[1], title: 'Sector B contour survey (50-100 acres)', description: 'Continue contour survey in Sector B. Rocky terrain expected - mark rock outcrops separately.', assigned_to: users['meera@globalconsultants.com'], status: 'in_progress', due_date: '2026-06-30' },
    { project: projects[1], title: 'Sector C & D contour survey (100-200 acres)', description: 'Complete remaining sectors. Include existing village roads and tank bund areas.', assigned_to: users['vikram@globalconsultants.com'], status: 'pending', due_date: '2026-07-30' },
    { project: projects[1], title: 'Prepare DTM/DEM and contour map', description: 'Process all field data in AutoCAD Civil 3D. Generate Digital Terrain Model. Prepare contour map with 0.5m and 1m intervals.', assigned_to: users['vikram@globalconsultants.com'], status: 'pending', due_date: '2026-08-15' },

    // SAT-2026-0004: Revenue Site Verification (Completed)
    { project: projects[3], title: 'Obtain revenue records from Bhoomi portal', description: 'Download Pahani/RTC, mutation register extract, and Tippan sketch for Sy. No. 45/2 from Bhoomi portal.', assigned_to: users['anita@globalconsultants.com'], status: 'completed', due_date: '2026-05-12' },
    { project: projects[3], title: 'Field boundary survey with DGPS', description: 'DGPS survey of all 4 boundaries. Locate existing boundary stones (Kallu Gundu). Check for Rajakaluve on east side.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-05-18' },
    { project: projects[3], title: 'Prepare survey report and boundary sketch', description: 'Compile survey report with area comparison (Tippan vs actual). Prepare boundary sketch with dimensions and coordinates.', assigned_to: users['anita@globalconsultants.com'], status: 'completed', due_date: '2026-05-22' },

    // SAT-2026-0005: Metro Alignment (In Progress)
    { project: projects[4], title: 'Establish primary DGPS control along ORR', description: 'Set up DGPS control points every 500m along 18km ORR stretch from Silk Board to KR Puram. Use SOI benchmarks.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-04-20' },
    { project: projects[4], title: 'Cross-section survey - Silk Board to HSR Layout', description: 'Cross-section surveys at 50m intervals. 6km stretch. Identify all structures within 30m corridor width.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-05-15' },
    { project: projects[4], title: 'Cross-section survey - HSR Layout to Marathahalli', description: 'Continue cross-sections. Heavy traffic area - night survey may be required. Coordinate with traffic police.', assigned_to: users['meera@globalconsultants.com'], status: 'in_progress', due_date: '2026-07-15' },
    { project: projects[4], title: 'Cross-section survey - Marathahalli to KR Puram', description: 'Final stretch. Include existing flyover and railway crossing details.', assigned_to: users['vikram@globalconsultants.com'], status: 'pending', due_date: '2026-08-30' },
    { project: projects[4], title: 'Prepare alignment corridor map', description: 'Compile all cross-sections. Prepare corridor map showing structures, utilities, and proposed alignment options.', assigned_to: users['vikram@globalconsultants.com'], status: 'pending', due_date: '2026-09-20' },

    // SAT-2026-0008: Court Survey (Delivered)
    { project: projects[7], title: 'Review court order and identify partition requirements', description: 'Study court order for partition details. 4-way equal partition of 3-acre property. Meet advocate for clarifications.', assigned_to: users['suresh@globalconsultants.com'], status: 'completed', due_date: '2026-04-18' },
    { project: projects[7], title: 'DGPS survey of entire property', description: 'High-accuracy DGPS survey of all boundaries. Record coordinates with sub-centimeter accuracy for court submission.', assigned_to: users['vikram@globalconsultants.com'], status: 'completed', due_date: '2026-04-25' },
    { project: projects[7], title: 'Compute equal partition with access roads', description: 'Calculate 4 equal portions ensuring each has road access. Consider existing structures and well location.', assigned_to: users['suresh@globalconsultants.com'], status: 'completed', due_date: '2026-05-02' },
    { project: projects[7], title: 'Prepare partition survey report for court', description: 'Formal survey report with DGPS coordinates, area computation for each partition, and sketch map. Include methodology statement.', assigned_to: users['anita@globalconsultants.com'], status: 'completed', due_date: '2026-05-08' },
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
      created_by: users['suresh@globalconsultants.com'],
    };
    if (t.status === 'completed') insert.completed_at = new Date().toISOString();
    await supabase.from('project_tasks').insert(insert);
  }
  console.log(`   ✓ ${taskDefs.length} tasks`);

  // 12. Project Notes (realistic Bangalore survey context)
  console.log('  Creating notes...');
  const noteDefs = [
    // SAT-2026-0001
    { project: projects[0], user: 'suresh@globalconsultants.com', content: 'Client (Prestige) confirmed access from east gate. Security guard will be informed. Entry pass required - contact Mr. Deepak at +91 98450 XXXXX.' },
    { project: projects[0], user: 'vikram@globalconsultants.com', content: 'Site visit completed. Found 3 existing boundary stones (Kallu Gundu) on north side. South-west corner stone missing - appears to have been disturbed during adjacent road construction.' },
    { project: projects[0], user: 'anita@globalconsultants.com', content: 'Revenue records collected from Hoskote DSSLR office. Tippan shows total area as 15.2 acres. Pahani/RTC downloaded from Bhoomi portal. Forwarding to survey team.' },
    { project: projects[0], user: 'vikram@globalconsultants.com', content: 'South boundary has a 2.5m discrepancy between Tippan measurement and ground condition. Adjacent plot owner (Sy. No. 78/6) claims the boundary has always been at the existing fence line. Need joint survey with Village Accountant.' },
    { project: projects[0], user: 'suresh@globalconsultants.com', content: 'Contacted Village Accountant for joint boundary verification. Available next Thursday. Informed client about south boundary issue.' },
    { project: projects[0], user: 'meera@globalconsultants.com', content: 'BBMP road widening notification found for the west side - 3m setback from existing road. This will reduce the usable area. Need to inform client.' },

    // SAT-2026-0002
    { project: projects[1], user: 'suresh@globalconsultants.com', content: 'BDA layout planning team meeting held. They need contour data by end of July for drainage design. Confirmed 0.5m contour interval is sufficient.' },
    { project: projects[1], user: 'vikram@globalconsultants.com', content: 'DGPS control network established. 8 primary control points set across the site. All points connected to SOI benchmark at Devanahalli railway station. Network adjustment shows max error of 3mm.' },
    { project: projects[1], user: 'meera@globalconsultants.com', content: 'Sector B has significant rock outcrops in the south-east corner. May affect layout road alignment. Marked separately on the survey map. Photos uploaded.' },

    // SAT-2026-0004
    { project: projects[3], user: 'vikram@globalconsultants.com', content: 'Survey completed. All 4 boundaries match Tippan within acceptable tolerance (max deviation: 0.3m on east side). No Rajakaluve encroachment found. 2 boundary stones present, 2 new ones recommended.' },
    { project: projects[3], user: 'anita@globalconsultants.com', content: 'Survey report sent to client (Mr. Venkatesh Gowda) via email. He confirmed receipt and is satisfied with the findings. EC check also clean - no encumbrances.' },

    // SAT-2026-0005
    { project: projects[4], user: 'suresh@globalconsultants.com', content: 'BMRCL project manager briefing completed. Corridor width confirmed as 30m. Need to mark all structures (buildings, walls, utility poles) within this width. Night survey permission obtained for HSR-Marathahalli stretch.' },
    { project: projects[4], user: 'vikram@globalconsultants.com', content: 'Silk Board to HSR stretch complete. 127 structures identified within 30m corridor. Major concern: 3 residential buildings and 1 temple within proposed alignment. Flagged to BMRCL for review.' },
    { project: projects[4], user: 'meera@globalconsultants.com', content: 'HSR to Marathahalli section ongoing. Night survey started from 11 PM to avoid traffic. BESCOM utility poles mapped - 45 poles need relocation. Coordinating with BESCOM team.' },

    // SAT-2026-0007
    { project: projects[6], user: 'suresh@globalconsultants.com', content: 'Project on hold. Client informed that DC conversion (agricultural to non-agricultural) is pending at Tahsildar office. Expected to take 4-6 weeks. Will resume survey once order is received.' },

    // SAT-2026-0008
    { project: projects[7], user: 'suresh@globalconsultants.com', content: 'Court order reviewed. 4-way equal partition required. Existing well falls on proposed boundary between Partition C and D - need to ensure shared access. Discussed with advocate.' },
    { project: projects[7], user: 'vikram@globalconsultants.com', content: 'DGPS survey complete. Total area measures 3.02 acres (Tippan shows 3.00 acres). Difference within acceptable limits. All coordinates recorded with sub-cm accuracy.' },
    { project: projects[7], user: 'suresh@globalconsultants.com', content: 'Partition computed: 4 equal plots of 0.755 acres each. Each plot has access to the main road via 6m internal access road. Well shared between C and D with 3m radius access easement.' },
    { project: projects[7], user: 'anita@globalconsultants.com', content: 'Final survey report prepared and submitted to advocate. Includes DGPS coordinates, area computation for each partition, AutoCAD drawing, and methodology statement. Report signed by Suresh (Licensed Surveyor).' },
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
  const day = (daysAgo, hour, minute) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const attendanceDefs = [
    // SAT-2026-0001: Whitefield site visits
    { project: projects[0], user: 'vikram@globalconsultants.com', checkIn: day(5, 8, 30), checkOut: day(5, 17, 0), lat: 12.9698, lng: 77.7500 },
    { project: projects[0], user: 'vikram@globalconsultants.com', checkIn: day(4, 9, 0), checkOut: day(4, 16, 30), lat: 12.9700, lng: 77.7502 },
    { project: projects[0], user: 'vikram@globalconsultants.com', checkIn: day(3, 8, 45), checkOut: day(3, 17, 15), lat: 12.9695, lng: 77.7498 },
    { project: projects[0], user: 'meera@globalconsultants.com', checkIn: day(3, 9, 15), checkOut: day(3, 14, 0), lat: 12.9698, lng: 77.7500 },
    { project: projects[0], user: 'vikram@globalconsultants.com', checkIn: day(1, 8, 30), checkOut: day(1, 18, 0), lat: 12.9701, lng: 77.7505 },

    // SAT-2026-0002: Devanahalli site
    { project: projects[1], user: 'vikram@globalconsultants.com', checkIn: day(10, 7, 30), checkOut: day(10, 16, 0), lat: 13.2350, lng: 77.7100 },
    { project: projects[1], user: 'vikram@globalconsultants.com', checkIn: day(9, 7, 45), checkOut: day(9, 17, 30), lat: 13.2355, lng: 77.7105 },
    { project: projects[1], user: 'meera@globalconsultants.com', checkIn: day(7, 8, 0), checkOut: day(7, 16, 45), lat: 13.2348, lng: 77.7098 },
    { project: projects[1], user: 'meera@globalconsultants.com', checkIn: day(2, 8, 15), checkOut: day(2, 17, 0), lat: 13.2352, lng: 77.7102 },

    // SAT-2026-0005: ORR Metro corridor
    { project: projects[4], user: 'vikram@globalconsultants.com', checkIn: day(15, 23, 0), checkOut: day(14, 4, 30), lat: 12.9172, lng: 77.6230 },
    { project: projects[4], user: 'meera@globalconsultants.com', checkIn: day(8, 23, 0), checkOut: day(7, 5, 0), lat: 12.9350, lng: 77.6400 },
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
      check_out_lat: a.lat + 0.0005,
      check_out_lng: a.lng + 0.0005,
    });
  }
  console.log(`   ✓ ${attendanceDefs.length} attendance logs`);

  // 14. Project Quotes
  console.log('  Creating payment data...');
  const quoteDefs = [
    { project: projects[0], amount: 350000 },   // Prestige Boundary Survey
    { project: projects[1], amount: 850000 },   // BDA Layout Topo
    { project: projects[3], amount: 45000 },    // Revenue Site Verification
    { project: projects[4], amount: 1500000 },  // Metro Alignment
    { project: projects[5], amount: 275000 },   // Sobha Topo
    { project: projects[7], amount: 75000 },    // Court Survey
  ];

  for (const q of quoteDefs) {
    await supabase.from('project_quotes').insert({
      organization_id: org.id,
      project_id: q.project.id,
      quoted_amount: q.amount,
      updated_by: users['rajesh@globalconsultants.com'],
    });
  }
  console.log(`   ✓ ${quoteDefs.length} project quotes`);

  // 15. Payment Entries
  const expenseMap = Object.fromEntries(expenses.map(e => [e.name, e.id]));

  const paymentDefs = [
    // SAT-2026-0001: Prestige (quoted 3.5L)
    { project: projects[0], type: 'advance', amount: 150000, method: 'bank_transfer', date: '2026-06-01', desc: 'Initial advance - 40% of quoted amount' },
    { project: projects[0], type: 'advance', amount: 50000, method: 'upi', date: '2026-06-15', desc: 'Second advance against fieldwork progress' },
    { project: projects[0], type: 'expense', amount: 12000, category: 'Survey Equipment', method: 'cash', date: '2026-06-03', desc: 'Total Station battery replacement and prism pole' },
    { project: projects[0], type: 'expense', amount: 8000, category: 'Travel & Transport', method: 'upi', date: '2026-06-05', desc: 'Travel to Whitefield site (5 trips)' },
    { project: projects[0], type: 'expense', amount: 15000, category: 'Staff Wages', method: 'bank_transfer', date: '2026-06-10', desc: 'Field assistant wages (2 helpers x 5 days)' },
    { project: projects[0], type: 'expense', amount: 3000, category: 'Vehicle & Fuel', method: 'cash', date: '2026-06-12', desc: 'Fuel for site vehicle' },
    { project: projects[0], type: 'expense', amount: 500, category: 'Government Fees', method: 'cash', date: '2026-06-04', desc: 'Tippan copy fee at DSSLR office' },

    // SAT-2026-0002: BDA Layout (quoted 8.5L)
    { project: projects[1], type: 'advance', amount: 300000, method: 'bank_transfer', date: '2026-05-15', desc: 'Govt advance - 35% of quoted amount via treasury' },
    { project: projects[1], type: 'expense', amount: 25000, category: 'DGPS/Instrument Rental', method: 'bank_transfer', date: '2026-05-20', desc: 'DGPS rental for control network (5 days @ Rs.5000/day)' },
    { project: projects[1], type: 'expense', amount: 20000, category: 'Staff Wages', method: 'bank_transfer', date: '2026-06-01', desc: 'Field crew wages - Sector A survey (4 persons x 10 days)' },
    { project: projects[1], type: 'expense', amount: 15000, category: 'Travel & Transport', method: 'upi', date: '2026-06-05', desc: 'Travel to Devanahalli site (daily commute, 15 days)' },
    { project: projects[1], type: 'expense', amount: 8000, category: 'Vehicle & Fuel', method: 'cash', date: '2026-06-10', desc: 'Fuel and vehicle maintenance' },
    { project: projects[1], type: 'expense', amount: 7000, category: 'Survey Equipment', method: 'cash', date: '2026-06-12', desc: 'Survey pegs, marking paint, and field supplies' },

    // SAT-2026-0004: Revenue Site (quoted 45K, completed)
    { project: projects[3], type: 'advance', amount: 25000, method: 'upi', date: '2026-05-10', desc: 'Advance payment via UPI from NRI client' },
    { project: projects[3], type: 'advance', amount: 20000, method: 'bank_transfer', date: '2026-05-23', desc: 'Balance payment after report delivery' },
    { project: projects[3], type: 'expense', amount: 5000, category: 'DGPS/Instrument Rental', method: 'cash', date: '2026-05-17', desc: 'DGPS rental for 1 day' },
    { project: projects[3], type: 'expense', amount: 3000, category: 'Travel & Transport', method: 'upi', date: '2026-05-17', desc: 'Travel to Devanahalli (Sadahalli village)' },
    { project: projects[3], type: 'expense', amount: 3000, category: 'Staff Wages', method: 'cash', date: '2026-05-18', desc: 'Field assistant for 1 day' },
    { project: projects[3], type: 'expense', amount: 500, category: 'Government Fees', method: 'cash', date: '2026-05-12', desc: 'RTC/Pahani download and Tippan copy fee' },
    { project: projects[3], type: 'expense', amount: 7000, category: 'Others', method: 'bank_transfer', date: '2026-05-20', desc: 'Report printing and binding (3 copies)' },

    // SAT-2026-0005: Metro (quoted 15L)
    { project: projects[4], type: 'advance', amount: 500000, method: 'bank_transfer', date: '2026-04-01', desc: 'First milestone payment from BMRCL (33%)' },
    { project: projects[4], type: 'expense', amount: 40000, category: 'DGPS/Instrument Rental', method: 'bank_transfer', date: '2026-04-10', desc: 'DGPS rental for control network (8 days)' },
    { project: projects[4], type: 'expense', amount: 30000, category: 'Staff Wages', method: 'bank_transfer', date: '2026-05-01', desc: 'Field crew wages (Silk Board-HSR stretch)' },
    { project: projects[4], type: 'expense', amount: 20000, category: 'Travel & Transport', method: 'upi', date: '2026-05-15', desc: 'Travel and night survey allowances' },
    { project: projects[4], type: 'expense', amount: 15000, category: 'Vehicle & Fuel', method: 'cash', date: '2026-05-20', desc: 'Vehicle rental for night surveys and fuel' },
    { project: projects[4], type: 'expense', amount: 5000, category: 'Survey Equipment', method: 'cash', date: '2026-04-05', desc: 'Reflective vests, safety cones for night work' },
    { project: projects[4], type: 'expense', amount: 10000, category: 'Others', method: 'bank_transfer', date: '2026-05-25', desc: 'Traffic police permission fees and coordination' },

    // SAT-2026-0008: Court Survey (quoted 75K, delivered)
    { project: projects[7], type: 'advance', amount: 35000, method: 'cheque', date: '2026-04-15', desc: 'Advance via cheque from advocate' },
    { project: projects[7], type: 'advance', amount: 40000, method: 'bank_transfer', date: '2026-05-12', desc: 'Balance payment after court report submission' },
    { project: projects[7], type: 'expense', amount: 8000, category: 'DGPS/Instrument Rental', method: 'cash', date: '2026-04-24', desc: 'DGPS rental for 2 days (court-grade accuracy)' },
    { project: projects[7], type: 'expense', amount: 5000, category: 'Staff Wages', method: 'cash', date: '2026-04-25', desc: 'Field assistant for 2 days' },
    { project: projects[7], type: 'expense', amount: 4000, category: 'Travel & Transport', method: 'upi', date: '2026-04-24', desc: 'Travel to Yelahanka site (2 trips)' },
    { project: projects[7], type: 'expense', amount: 5000, category: 'Others', method: 'bank_transfer', date: '2026-05-09', desc: 'Report printing, binding, and notarization (5 copies for court)' },
    { project: projects[7], type: 'expense', amount: 10000, category: 'Others', method: 'bank_transfer', date: '2026-05-10', desc: 'Licensed Surveyor certification fee' },
  ];

  for (const p of paymentDefs) {
    const categoryId = p.category ? expenseMap[p.category] : null;
    await supabase.from('payment_entries').insert({
      organization_id: org.id,
      project_id: p.project.id,
      type: p.type,
      amount: p.amount,
      category_id: categoryId,
      description: p.desc,
      payment_method: p.method,
      date: p.date,
      created_by: users['rajesh@globalconsultants.com'],
    });
  }
  console.log(`   ✓ ${paymentDefs.length} payment entries`);

  // 16. Closure Checklist Items
  console.log('  Creating closure checklist...');
  const checklistDefs = [
    { title: 'Final survey report uploaded', display_order: 0 },
    { title: 'AutoCAD drawings uploaded', display_order: 1 },
    { title: 'All deliverables uploaded', display_order: 2 },
    { title: 'All payments received', display_order: 3 },
    { title: 'AutoCAD files version-finalized', display_order: 4 },
    { title: 'Revenue records cross-verified', display_order: 5 },
    { title: 'Client confirmed delivery', display_order: 6 },
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
  console.log(`   Project Types: ${projectTypes.length} (${typeNames.join(', ')})`);
  console.log(`   Clients: ${clients.length}`);
  console.log(`   Projects: ${projects.length} (${projects.map(p => p.project_number).join(', ')})`);
  console.log(`   Tasks: ${taskDefs.length}`);
  console.log(`   Notes: ${noteDefs.length}`);
  console.log(`   Attendance logs: ${attendanceDefs.length}`);
  console.log(`   Quotes: ${quoteDefs.length}`);
  console.log(`   Payment entries: ${paymentDefs.length}`);
  console.log(`   Closure checklist: ${checklistItems.length} items`);
  console.log('\n🔑 Login credentials:');
  for (const def of userDefs) {
    const status = def.email === 'ravi@globalconsultants.com' ? ' [DEACTIVATED]' : '';
    console.log(`   ${def.email} / ${TEST_PASSWORD} (${def.roles.join(', ')})${status}`);
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
