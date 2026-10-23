-- ====================================================================
-- VINZFLOW MULTI-CURRENCY CONVERSION & INVOICING MIGRATION
-- File: supabase/migrations/007_currency_conversion_and_invoices.sql
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yylfprczgqvakkkdctal/sql
-- ====================================================================

-- 1. Ensure projects table has multi-currency conversion fields
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS enable_currency_conversion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(14, 4) DEFAULT 57.50;

-- 2. Ensure project_invoices table has multi-currency conversion columns
ALTER TABLE public.project_invoices 
  ADD COLUMN IF NOT EXISTS enable_currency_conversion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_currency TEXT DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC(14, 4) DEFAULT 57.50,
  ADD COLUMN IF NOT EXISTS converted_total_amount NUMERIC(14, 2) DEFAULT 0;

-- Fast query indexes
CREATE INDEX IF NOT EXISTS idx_projects_converted_currency ON public.projects(converted_currency);
CREATE INDEX IF NOT EXISTS idx_project_invoices_converted_currency ON public.project_invoices(converted_currency);

-- 3. Backfill existing records with safe default values
UPDATE public.projects 
SET enable_currency_conversion = false 
WHERE enable_currency_conversion IS NULL;

UPDATE public.projects 
SET converted_currency = 'PHP' 
WHERE converted_currency IS NULL;

UPDATE public.projects 
SET conversion_rate = 57.50 
WHERE conversion_rate IS NULL;
