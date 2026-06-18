-- Project quoted amounts
CREATE TABLE project_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  quoted_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, project_id)
);

CREATE INDEX idx_project_quotes_project ON project_quotes(project_id);

-- Payment entries (advances and expenses)
CREATE TABLE payment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  type TEXT NOT NULL CHECK (type IN ('advance', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  description TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_path TEXT,
  receipt_name TEXT,
  receipt_size INTEGER,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_entries_project ON payment_entries(project_id);
CREATE INDEX idx_payment_entries_org ON payment_entries(organization_id);
CREATE INDEX idx_payment_entries_date ON payment_entries(date);
CREATE INDEX idx_payment_entries_type ON payment_entries(type);
