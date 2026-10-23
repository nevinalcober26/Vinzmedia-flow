-- ====================================================================
-- VINZFLOW MIGRATION: WEEKLY TIMESHEETS, DAILY TOTALS & CAPACITY HOURS
-- Migration: 011_weekly_timesheet_and_capacity.sql
-- ====================================================================

-- 1. Ensure time_entries table has entry_date column for optimized daily queries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  entry_date DATE DEFAULT CURRENT_DATE,
  is_billable BOOLEAN DEFAULT true,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Backfill entry_date from started_at where null
UPDATE public.time_entries 
SET entry_date = DATE(started_at)
WHERE entry_date IS NULL AND started_at IS NOT NULL;

-- 2. Indexes for high-speed timesheet daily & weekly lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_entry_date ON public.time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_date ON public.time_entries(task_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON public.time_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_started ON public.time_entries(started_at DESC);

-- 3. Profiles: Support Weekly Capacity Hours set per user/member
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_capacity_hours NUMERIC(6, 2) DEFAULT 40.0;

-- 4. Projects: Support Estimated Hours Per Week capacity allocation
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS estimated_hours_per_week NUMERIC(8, 2) DEFAULT 40.0,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0.0;

-- 5. Helper Function: Get Daily & Weekly Totals for a User or Project
CREATE OR REPLACE FUNCTION public.get_weekly_timesheet_summary(
  p_start_date DATE,
  p_end_date DATE,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  entry_date DATE,
  total_seconds BIGINT,
  total_hours NUMERIC,
  entry_count BIGINT
) 
LANGUAGE sql STABLE
AS $$
  SELECT 
    COALESCE(te.entry_date, DATE(te.started_at)) AS entry_date,
    SUM(te.duration_seconds)::BIGINT AS total_seconds,
    ROUND((SUM(te.duration_seconds)::NUMERIC / 3600.0), 2) AS total_hours,
    COUNT(te.id)::BIGINT AS entry_count
  FROM public.time_entries te
  WHERE (COALESCE(te.entry_date, DATE(te.started_at)) BETWEEN p_start_date AND p_end_date)
    AND (p_user_id IS NULL OR te.user_id = p_user_id)
  GROUP BY COALESCE(te.entry_date, DATE(te.started_at))
  ORDER BY entry_date ASC;
$$;
