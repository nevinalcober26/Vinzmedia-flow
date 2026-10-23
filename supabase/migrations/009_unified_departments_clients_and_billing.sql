-- ====================================================================
-- VINZFLOW UNIFIED MIGRATION: DEPARTMENTS, CLIENTS & REALTIME BILLING
-- File: supabase/migrations/009_unified_departments_clients_and_billing.sql
-- ====================================================================

-- 1. Ensure projects table has Client, Departments, Task Types & Realtime Billing columns
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT ARRAY[
    'Engineering', 
    'Design & Creative', 
    'Marketing & Growth', 
    'Product Management', 
    'QA & Security', 
    'Operations & HR', 
    'Sales & Client Success'
  ],
  ADD COLUMN IF NOT EXISTS task_types TEXT[] DEFAULT ARRAY[
    'Development', 
    'Marketing', 
    'Design', 
    'QA / Testing', 
    'Content & Copy', 
    'Operations', 
    'Research & Strategy'
  ],
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'fixed' CHECK (billing_type IN ('fixed', 'hourly')),
  ADD COLUMN IF NOT EXISTS fixed_price_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_installments_count INTEGER DEFAULT 1 CHECK (payment_installments_count >= 1),
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours_per_week NUMERIC(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '$',
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enable_currency_conversion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(14, 4) DEFAULT 1.0;

-- Fast lookup indexes on projects
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_billing_type ON public.projects(billing_type);
CREATE INDEX IF NOT EXISTS idx_projects_converted_currency ON public.projects(converted_currency);

-- 2. Ensure tasks table has department, task type, time tracking & settlement columns
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Engineering',
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Development',
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Fast lookup indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_is_paid ON public.tasks(is_paid);
CREATE INDEX IF NOT EXISTS idx_tasks_tracked_seconds ON public.tasks(tracked_seconds);

-- 3. Ensure client_projects relation table exists for many-to-many associations
CREATE TABLE IF NOT EXISTS public.client_projects (
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (client_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_project ON public.client_projects(project_id);

-- Enable RLS for client_projects
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage client_projects" ON public.client_projects;
CREATE POLICY "Authenticated users can manage client_projects"
  ON public.client_projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Ensure project_invoices has multi-currency conversion columns
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

ALTER TABLE public.project_invoices
  ADD COLUMN IF NOT EXISTS enable_currency_conversion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(14, 4) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS converted_total_amount NUMERIC(14, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_invoices_project ON public.project_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_number ON public.project_invoices(invoice_number);

-- 5. Safe Backfills for existing records with NULL values
UPDATE public.projects 
SET departments = ARRAY[
  'Engineering', 
  'Design & Creative', 
  'Marketing & Growth', 
  'Product Management', 
  'QA & Security', 
  'Operations & HR', 
  'Sales & Client Success'
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

-- 6. Ensure Realtime Publication includes all updated tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.client_projects;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invoices;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
