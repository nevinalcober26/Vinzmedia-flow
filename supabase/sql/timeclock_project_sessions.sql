-- Paste this into the Supabase SQL Editor after the existing VinzFlow migrations.
-- Project time sessions can have no task; work_summary is shown in Session Logs.

ALTER TABLE public.time_entries
  ALTER COLUMN task_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS work_summary text;

UPDATE public.time_entries AS entry
SET project_id = task.project_id,
    workspace_id = task.workspace_id
FROM public.tasks AS task
WHERE entry.task_id = task.id
  AND (entry.project_id IS NULL OR entry.workspace_id IS NULL);

UPDATE public.time_entries AS entry
SET workspace_id = project.workspace_id
FROM public.projects AS project
WHERE entry.project_id = project.id
  AND entry.workspace_id IS NULL;

UPDATE public.time_entries
SET work_summary = description
WHERE work_summary IS NULL AND description IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_workspace_started
  ON public.time_entries (workspace_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_started
  ON public.time_entries (project_id, started_at DESC);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Enable all access for time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_workspace_read" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_own_insert" ON public.time_entries;

CREATE POLICY "time_entries_workspace_read"
ON public.time_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = time_entries.workspace_id
      AND member.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces AS workspace
    WHERE workspace.id = time_entries.workspace_id
      AND workspace.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "time_entries_own_insert"
ON public.time_entries FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects AS project
    WHERE project.id = time_entries.project_id
      AND project.workspace_id = time_entries.workspace_id
  )
  AND (
    task_id IS NULL OR EXISTS (
      SELECT 1 FROM public.tasks AS task
      WHERE task.id = time_entries.task_id
        AND task.project_id = time_entries.project_id
        AND task.workspace_id = time_entries.workspace_id
    )
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.workspace_members AS member
      WHERE member.workspace_id = time_entries.workspace_id
        AND member.user_id = (SELECT auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM public.workspaces AS workspace
      WHERE workspace.id = time_entries.workspace_id
        AND workspace.owner_id = (SELECT auth.uid())
    )
  )
);

REVOKE ALL ON public.time_entries FROM anon;
GRANT SELECT, INSERT ON public.time_entries TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Confirmation: these rows should be returned after the script succeeds.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'time_entries'
  AND column_name IN ('task_id', 'workspace_id', 'project_id', 'work_summary')
ORDER BY column_name;
