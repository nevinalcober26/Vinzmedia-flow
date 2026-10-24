-- Run after timeclock_task_summaries.sql in the Supabase SQL Editor.
-- Only the creator of a time entry may edit or delete it.

DROP POLICY IF EXISTS "time_entries_own_update" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_own_delete" ON public.time_entries;

CREATE POLICY "time_entries_own_update"
ON public.time_entries FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = time_entries.workspace_id
      AND member.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces AS workspace
    WHERE workspace.id = time_entries.workspace_id
      AND workspace.owner_id = (SELECT auth.uid())
  ))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND task_id IS NOT NULL
  AND project_id IS NOT NULL
  AND duration_seconds > 0
  AND EXISTS (
    SELECT 1 FROM public.tasks AS task
    WHERE task.id = time_entries.task_id
      AND task.project_id = time_entries.project_id
      AND task.workspace_id = time_entries.workspace_id
  )
  AND (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = time_entries.workspace_id
      AND member.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces AS workspace
    WHERE workspace.id = time_entries.workspace_id
      AND workspace.owner_id = (SELECT auth.uid())
  ))
);

CREATE POLICY "time_entries_own_delete"
ON public.time_entries FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND (EXISTS (
    SELECT 1 FROM public.workspace_members AS member
    WHERE member.workspace_id = time_entries.workspace_id
      AND member.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces AS workspace
    WHERE workspace.id = time_entries.workspace_id
      AND workspace.owner_id = (SELECT auth.uid())
  ))
);

GRANT UPDATE, DELETE ON public.time_entries TO authenticated;
NOTIFY pgrst, 'reload schema';
