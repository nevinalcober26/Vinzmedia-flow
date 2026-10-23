-- ====================================================================
-- VINZFLOW PROJECT PRICING, PAYMENT SETTLEMENT & TIME CLOCK MIGRATION
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yylfprczgqvakkkdctal/sql
-- ====================================================================

-- 1. Ensure projects table has billing & payment settlement columns
ALTER TABLE public.projects 
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
  ADD COLUMN IF NOT EXISTS installments JSONB DEFAULT '[]'::jsonb;

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_billing_type ON public.projects(billing_type);
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON public.projects(payment_status);

-- 2. Ensure tasks table has time tracking and paid status columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tracked_seconds ON public.tasks(tracked_seconds);
CREATE INDEX IF NOT EXISTS idx_tasks_is_paid ON public.tasks(is_paid);

-- 3. Project Payment Installments Table (for Fixed Price Milestone Payments)
CREATE TABLE IF NOT EXISTS public.project_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  percentage NUMERIC(5, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist if table was already created in earlier migration
ALTER TABLE public.project_payments
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_project_payments_project ON public.project_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_payments_status ON public.project_payments(status);

-- 4. Project Billing Invoices Table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.project_invoices
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT '$',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_project_invoices_project ON public.project_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_number ON public.project_invoices(invoice_number);

-- 5. Granular Task Time Entries Table (for Hourly Labor Sessions)
CREATE TABLE IF NOT EXISTS public.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Crucial: Ensure is_paid exists even if task_time_logs was created in previous migration without it
ALTER TABLE public.task_time_logs
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user ON public.task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_is_paid ON public.task_time_logs(is_paid);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_created ON public.task_time_logs(created_at DESC);

-- 6. Row Level Security (RLS) Configuration
ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated members full workspace access to project payments
DROP POLICY IF EXISTS "Authenticated users can manage project payments" ON public.project_payments;
CREATE POLICY "Authenticated users can manage project payments"
  ON public.project_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_payments.project_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_payments.project_id
        AND wm.user_id = auth.uid()
    )
  );

-- Allow authenticated members full workspace access to project invoices
DROP POLICY IF EXISTS "Authenticated users can manage project invoices" ON public.project_invoices;
CREATE POLICY "Authenticated users can manage project invoices"
  ON public.project_invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_invoices.project_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_invoices.project_id
        AND wm.user_id = auth.uid()
    )
  );

-- Allow authenticated users to view & manage task time logs
DROP POLICY IF EXISTS "Authenticated users can manage task time logs" ON public.task_time_logs;
CREATE POLICY "Authenticated users can manage task time logs"
  ON public.task_time_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE t.id = task_time_logs.task_id
        AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE t.id = task_time_logs.task_id
        AND wm.user_id = auth.uid()
    )
  );

-- 7. Realtime Publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_payments;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.project_invoices;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.task_time_logs;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
