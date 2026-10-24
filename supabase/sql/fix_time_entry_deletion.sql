-- Run in the VinzFlow project's Supabase SQL Editor.
-- Allows signed-in members to delete only their own workspace time entries.
BEGIN;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.time_entries TO authenticated;
REVOKE ALL ON public.time_entries FROM anon;

DROP POLICY IF EXISTS time_entries_workspace_read ON public.time_entries;
CREATE POLICY time_entries_workspace_read ON public.time_entries
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = time_entries.workspace_id AND m.user_id = (SELECT auth.uid()))
  OR EXISTS (SELECT 1 FROM public.workspaces w
    WHERE w.id = time_entries.workspace_id AND w.owner_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS time_entries_own_delete ON public.time_entries;
CREATE POLICY time_entries_own_delete ON public.time_entries
FOR DELETE TO authenticated USING (
  user_id = (SELECT auth.uid()) AND (
    EXISTS (SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = time_entries.workspace_id AND m.user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.workspaces w
      WHERE w.id = time_entries.workspace_id AND w.owner_id = (SELECT auth.uid()))
  )
);
-- Keep older permissive policies from granting deletion of someone else's logs.
DROP POLICY IF EXISTS time_entries_delete_guard ON public.time_entries;
CREATE POLICY time_entries_delete_guard ON public.time_entries AS RESTRICTIVE
FOR DELETE TO authenticated USING (
  user_id = (SELECT auth.uid()) AND (
    EXISTS (SELECT 1 FROM public.workspace_members m
      WHERE m.workspace_id = time_entries.workspace_id AND m.user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.workspaces w
      WHERE w.id = time_entries.workspace_id AND w.owner_id = (SELECT auth.uid()))
  )
);
COMMIT;
NOTIFY pgrst, 'reload schema';
