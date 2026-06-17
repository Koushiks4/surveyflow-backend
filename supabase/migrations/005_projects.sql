CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_number TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  project_type_id UUID REFERENCES project_types(id),
  status_id UUID REFERENCES project_statuses(id),
  title TEXT NOT NULL,
  description TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_address TEXT,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, project_number)
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status_id);

CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id, role_id)
);

CREATE INDEX idx_assignments_project ON project_assignments(project_id);
CREATE INDEX idx_assignments_user ON project_assignments(user_id);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_project ON documents(project_id);

CREATE OR REPLACE FUNCTION generate_project_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  new_counter INTEGER;
BEGIN
  UPDATE organizations
  SET project_id_counter = project_id_counter + 1,
      updated_at = NOW()
  WHERE id = org_id
  RETURNING project_id_prefix, project_id_counter
  INTO prefix, new_counter;

  RETURN prefix || '-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(new_counter::TEXT, 4, '0');
END;
$$;
