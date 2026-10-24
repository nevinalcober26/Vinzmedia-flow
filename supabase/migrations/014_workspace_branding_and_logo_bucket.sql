-- ====================================================================
-- 014 · WORKSPACE BRANDING (logo + name + tagline) & LOGO STORAGE BUCKET
-- Run this whole script in the Supabase SQL Editor.
-- Safe to re-run (idempotent).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TABLE: add branding columns to public.workspaces
--    (logo_url already exists from 001; we add tagline + logo_path)
-- --------------------------------------------------------------------
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS logo_url  TEXT,
  ADD COLUMN IF NOT EXISTS logo_path TEXT,      -- storage object path, used to delete old logos
  ADD COLUMN IF NOT EXISTS tagline   TEXT;

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_tagline_length;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_tagline_length CHECK (tagline IS NULL OR char_length(tagline) <= 80);

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_name_length;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 80);

-- Seed the default tagline for the existing VinzMedia workspace
UPDATE public.workspaces
SET tagline = 'Design & Development'
WHERE tagline IS NULL AND slug = 'vinzmedia-hq';

-- (updated_at is already maintained by trigger set_updated_at_workspaces from 001)

-- --------------------------------------------------------------------
-- 2. HELPER: who may manage a workspace's branding?
--    Uses private.workspace_access(..., 'workspace:manage') when the
--    RBAC script (supabase/sql/workspace_roles.sql) is installed,
--    otherwise falls back to owner / admin membership.
-- --------------------------------------------------------------------
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

-- --------------------------------------------------------------------
-- 5. QUICK VERIFICATION (optional — run after the script)
-- --------------------------------------------------------------------
-- SELECT id, name, tagline, logo_url FROM public.workspaces;
-- SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'workspace-logos';
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND policyname LIKE 'workspace_logos_%';
