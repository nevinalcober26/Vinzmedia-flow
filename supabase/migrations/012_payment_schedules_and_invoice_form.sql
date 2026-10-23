-- ====================================================================
-- VINZFLOW MIGRATION: PAYMENT SCHEDULES, BILLING TERMS & INVOICE FORM
-- Migration: 012_payment_schedules_and_invoice_form.sql
-- ====================================================================

-- 1. Projects Table: Add Payment Schedule, Terms Days and Bank Remittance Details
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT '30_days',
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban TEXT,
  ADD COLUMN IF NOT EXISTS bank_currency TEXT,
  ADD COLUMN IF NOT EXISTS swift_bic TEXT,
  ADD COLUMN IF NOT EXISTS routing_number TEXT;

-- Set default for existing projects where payment_schedule is null
UPDATE public.projects
SET payment_schedule = '30_days', payment_terms_days = 30
WHERE payment_schedule IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_payment_schedule ON public.projects(payment_schedule);

-- 2. Clients Table: Add Address and Tax ID for Invoicing
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- 3. Invoices Table (Create or Update for Persistent Invoicing)
CREATE TABLE IF NOT EXISTS public.project_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  billing_type TEXT DEFAULT 'fixed',
  payment_schedule TEXT DEFAULT '30_days',
  payment_terms_days INTEGER DEFAULT 30,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12, 2) DEFAULT 0.0,
  tax_rate NUMERIC(5, 2) DEFAULT 0.0,
  tax_amount NUMERIC(12, 2) DEFAULT 0.0,
  discount_amount NUMERIC(12, 2) DEFAULT 0.0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.0,
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  enable_currency_conversion BOOLEAN DEFAULT false,
  converted_currency TEXT DEFAULT 'PHP',
  conversion_rate NUMERIC(14, 4) DEFAULT 1.0,
  converted_total_amount NUMERIC(14, 2),
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  bank_iban TEXT,
  bank_currency TEXT,
  swift_bic TEXT,
  routing_number TEXT,
  notes TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_project_invoices_project ON public.project_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invoices_status ON public.project_invoices(status);
CREATE INDEX IF NOT EXISTS idx_project_invoices_due ON public.project_invoices(due_date);

-- Ensure columns exist if table was already created
ALTER TABLE public.project_invoices
  ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT '30_days',
  ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban TEXT,
  ADD COLUMN IF NOT EXISTS bank_currency TEXT,
  ADD COLUMN IF NOT EXISTS swift_bic TEXT,
  ADD COLUMN IF NOT EXISTS routing_number TEXT,
  ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb;

-- 4. Enable RLS and public policies for project_invoices
ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_invoices' AND policyname = 'Allow authenticated users full access to project_invoices'
  ) THEN
    CREATE POLICY "Allow authenticated users full access to project_invoices"
      ON public.project_invoices
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_invoices' AND policyname = 'Allow anon select on project_invoices'
  ) THEN
    CREATE POLICY "Allow anon select on project_invoices"
      ON public.project_invoices
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
