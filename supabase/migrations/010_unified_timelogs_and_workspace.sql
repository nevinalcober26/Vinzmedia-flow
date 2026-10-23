-- ====================================================================
-- VINZFLOW UNIFIED MIGRATION: TIME LOGS, PROJECT COLUMNS, CLIENTS & BILLING
-- Migration: 010_unified_timelogs_and_workspace.sql
-- ====================================================================

-- 1. Create or Update Core Time Entries Table
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  is_billable BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist on public.time_entries
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON public.time_entries(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_paid ON public.time_entries(is_paid);

-- Compatibility alias table for task_time_logs
CREATE TABLE IF NOT EXISTS public.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tasks Table: Time Tracking, Settlement & Department Columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Development',
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Engineering';

CREATE INDEX IF NOT EXISTS idx_tasks_tracked_seconds ON public.tasks(tracked_seconds);
CREATE INDEX IF NOT EXISTS idx_tasks_is_paid ON public.tasks(is_paid);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);

-- 3. Projects Table: Pricing, Hourly Rates, Departments & Currency
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS fixed_price_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_installments_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours_per_week NUMERIC(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '$',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enable_currency_conversion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(14, 4) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT ARRAY['Engineering', 'Design & Creative', 'Marketing & Growth', 'Product Management', 'QA & Security'],
  ADD COLUMN IF NOT EXISTS task_types TEXT[] DEFAULT ARRAY['Development', 'Marketing', 'Design', 'QA / Testing', 'Content & Copy', 'Operations', 'Research & Strategy'],
  ADD COLUMN IF NOT EXISTS client_id UUID;

CREATE INDEX IF NOT EXISTS idx_projects_billing_type ON public.projects(billing_type);
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON public.projects(payment_status);

-- 4. Clients & Client Projects Mapping
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'lead', 'past')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_workspace ON public.clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

CREATE TABLE IF NOT EXISTS public.client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(client_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_project ON public.client_projects(project_id);

-- 5. Project Payment Milestones & Invoices Tables
CREATE TABLE IF NOT EXISTS public.project_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  percentage NUMERIC(5, 2) DEFAULT 0,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.project_payments
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_payments_project ON public.project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_status ON public.project_payments(status);

CREATE TABLE IF NOT EXISTS public.project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  billing_type TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT '$',
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  line_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  enable_currency_conversion BOOLEAN DEFAULT false,
  converted_currency TEXT DEFAULT 'PHP',
  conversion_rate NUMERIC(14, 4) DEFAULT 1.0,
  converted_total_amount NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_project_invoices_project ON public.project_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_number ON public.project_invoices(invoice_number);

-- 6. Safe Defaults Backfill
UPDATE public.projects 
SET departments = ARRAY[
  'Engineering', 
  'Design & Creative', 
  'Marketing & Growth', 
  'Product Management', 
  'QA & Security'
]
WHERE departments IS NULL;

UPDATE public.projects 
SET task_types = ARRAY[
  'Development', 
  'Marketing', 
  'Design', 
  'QA / Testing', 
  'Content & Copy', 
  'Operations', 
  'Research & Strategy'
]
WHERE task_types IS NULL;

UPDATE public.tasks 
SET department = 'Engineering' 
WHERE department IS NULL;

UPDATE public.tasks 
SET task_type = 'Development' 
WHERE task_type IS NULL;

-- 7. Universal Permissive RLS Policies (Allow access to both Public & Authenticated)
DO $$
DECLARE
  tbl text;
  tables_to_secure text[] := ARRAY[
    'time_entries',
    'task_time_logs',
    'projects',
    'tasks',
    'clients',
    'client_projects',
    'project_payments',
    'project_invoices'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_secure
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public access for %s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for %s" ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can manage %s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Public access for %s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl, tbl);
  END LOOP;
END $$;

-- 8. Realtime Live Subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.time_entries; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_time_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.projects; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.clients; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_projects; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.project_payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invoices; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
