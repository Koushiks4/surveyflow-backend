CREATE TABLE project_delivery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_delivery_tokens_project ON project_delivery_tokens(project_id);
CREATE INDEX idx_delivery_tokens_token ON project_delivery_tokens(token);

-- Add client comment field to projects
ALTER TABLE projects ADD COLUMN client_comment TEXT;
