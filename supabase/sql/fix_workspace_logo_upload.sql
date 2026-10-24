-- Run the entire file in the SQL Editor of your VinzFlow Supabase project.
-- Repairs workspace-logo permissions without granting access to other buckets.
BEGIN;
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS logo_path text,
  ADD COLUMN IF NOT EXISTS tagline text;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.can_manage_workspace(target_text text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target uuid;
  ok boolean;
BEGIN
  IF auth.uid() IS NULL OR target_text IS NULL
     OR target_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  target := target_text::uuid;

  IF to_regprocedure('private.workspace_access(uuid,text)') IS NOT NULL THEN
    EXECUTE 'SELECT private.workspace_access($1, $2)' INTO ok USING target, 'workspace:manage';
    RETURN coalesce(ok, false);
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = target AND (
      w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = target
          AND m.user_id = auth.uid()
          AND m.role IN ('owner', 'admin')
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.can_manage_workspace(text) FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_workspace(text) TO authenticated;

-- --------------------------------------------------------------------
-- 3. STORAGE BUCKET: workspace-logos (public read, 2 MB, images only)
--    Object path convention:  <workspace_id>/<timestamp>-logo.<ext>
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-logos',
  'workspace-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- --------------------------------------------------------------------
-- 4. STORAGE POLICIES (storage.objects already has RLS enabled)
--    Public URLs work without a SELECT policy because the bucket is public.
--    Only workspace managers can list / upload / replace / delete logos,
--    and only inside their own workspace folder.
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "workspace_logos_select_managers" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_insert_managers" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_update_managers" ON storage.objects;
DROP POLICY IF EXISTS "workspace_logos_delete_managers" ON storage.objects;

CREATE POLICY "workspace_logos_select_managers" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (SELECT private.can_manage_workspace((storage.foldername(name))[1]))
  );

CREATE POLICY "workspace_logos_insert_managers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (SELECT private.can_manage_workspace((storage.foldername(name))[1]))
  );

CREATE POLICY "workspace_logos_update_managers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (SELECT private.can_manage_workspace((storage.foldername(name))[1]))
  )
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND (SELECT private.can_manage_workspace((storage.foldername(name))[1]))
  );

CREATE POLICY "workspace_logos_delete_managers" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND (SELECT private.can_manage_workspace((storage.foldername(name))[1]))
  );

COMMIT;

SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'workspace_logos_%';
