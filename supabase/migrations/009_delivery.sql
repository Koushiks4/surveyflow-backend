-- Project deliverables (final files for client delivery)
CREATE TABLE project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_project ON project_deliverables(project_id);
CREATE INDEX idx_deliverables_org ON project_deliverables(organization_id);

-- Closure checklist items (configurable per org)
CREATE TABLE closure_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, title)
);

-- Project closure checks (per-project tracking)
CREATE TABLE project_closure_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES closure_checklist_items(id),
  checked BOOLEAN DEFAULT FALSE,
  checked_by UUID REFERENCES profiles(id),
  checked_at TIMESTAMPTZ,
  UNIQUE(project_id, checklist_item_id)
);

CREATE INDEX idx_closure_checks_project ON project_closure_checks(project_id);

-- Add delivery fields to projects
ALTER TABLE projects ADD COLUMN delivery_confirmed_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN delivery_confirmed_by UUID REFERENCES profiles(id);
ALTER TABLE projects ADD COLUMN delivery_notes TEXT;
