-- ====================================================================
-- VINZFLOW MIGRATION: NOTIFICATION CENTER BILLING & INVOICE INTEGRATION
-- Migration: 013_billing_and_invoice_notifications.sql
-- ====================================================================

-- 1. Notifications Table: Update check constraint to support billing and invoice notification types
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

  -- Add updated constraint including 'billing' and 'invoice'
  ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
      'task_assigned', 
      'mention', 
      'comment', 
      'deadline', 
      'status_change', 
      'announcement', 
      'system', 
      'billing', 
      'invoice'
    ));
END $$;

-- 2. Performance indexes for Notification Center popover
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace 
  ON public.notifications(user_id, workspace_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON public.notifications(type);

-- 3. Ensure all project billing schedule, terms, and bank remittance columns exist
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

-- 4. Ensure clients invoicing fields exist
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT;
