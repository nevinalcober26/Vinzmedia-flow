-- ====================================================================
-- VINZFLOW TASK TYPE & DEPARTMENT WORKSPACE CATEGORIZATION MIGRATION
-- File: supabase/migrations/006_task_types_and_departments.sql
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yylfprczgqvakkkdctal/sql
-- ====================================================================

-- 1. Ensure tasks table has task_type and department columns
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Development',
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Engineering',
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracked_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_timer_running BOOLEAN DEFAULT false;

-- 2. Create fast lookup indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_is_paid ON public.tasks(is_paid);
CREATE INDEX IF NOT EXISTS idx_tasks_tracked_seconds ON public.tasks(tracked_seconds);

-- 3. Ensure projects table has custom task types and departments arrays
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS task_types TEXT[] DEFAULT ARRAY[
    'Development', 
    'Marketing', 
    'Design', 
    'QA / Testing', 
    'Content & Copy', 
    'Operations', 
    'Research & Strategy'
  ],
  ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT ARRAY[
    'Engineering', 
    'Design & Creative', 
    'Marketing & Growth', 
    'Product Management', 
    'QA & Security', 
    'Operations & HR', 
    'Sales & Client Success'
  ];

-- 4. Backfill existing task rows with default values if currently NULL
UPDATE public.tasks 
SET task_type = 'Development' 
WHERE task_type IS NULL;

UPDATE public.tasks 
SET department = 'Engineering' 
WHERE department IS NULL;

UPDATE public.tasks 
SET is_paid = false 
WHERE is_paid IS NULL;

UPDATE public.tasks 
SET tracked_seconds = 0 
WHERE tracked_seconds IS NULL;
