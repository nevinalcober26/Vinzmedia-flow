-- Run this entire file once in the Supabase SQL Editor as postgres.
-- Existing role customizations and assignments are preserved on repeat runs.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.workspace_roles (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  base_role text NOT NULL CHECK (base_role IN ('owner','admin','project_manager','member','guest')),
  sidebar jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(sidebar) = 'array'),
  permissions jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(permissions) = 'array'),
  PRIMARY KEY (workspace_id,role_key),
  CHECK ((role_key = 'owner' AND base_role = 'owner') OR
         (role_key = 'super_admin' AND base_role = 'admin') OR
         (role_key NOT IN ('owner','super_admin') AND base_role IN ('project_manager','member','guest')))
);
CREATE TABLE IF NOT EXISTS public.workspace_role_assignments (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  PRIMARY KEY (workspace_id,user_id),
  FOREIGN KEY (workspace_id,role_key) REFERENCES public.workspace_roles(workspace_id,role_key)
);
CREATE INDEX IF NOT EXISTS workspace_role_assignments_user_idx ON public.workspace_role_assignments(user_id,workspace_id);
CREATE INDEX IF NOT EXISTS workspace_role_assignments_role_idx ON public.workspace_role_assignments(workspace_id,role_key);

-- Non-exposed helper: seed the same defaults used by the application.
CREATE OR REPLACE FUNCTION private.seed_workspace_roles(target uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $fn$
  INSERT INTO public.workspace_roles(workspace_id,role_key,name,base_role,sidebar,permissions)
  SELECT target, r->>'key', r->>'name', r->>'base_role', r->'sidebar', r->'permissions'
  FROM jsonb_array_elements('[{"key":"owner","name":"Owner","base_role":"owner","sidebar":["dashboard","my_tasks","projects","calendar","timelogs","billing","clients","team","announcements","notes","workload","activity","settings"],"permissions":["workspace:manage","workspace:delete","members:invite","members:manage_roles","members:remove","project:create","project:edit","project:delete","project:archive","task:create","task:edit","task:delete","task:move","announcement:create","note:create","note:edit","comment:create"]},{"key":"super_admin","name":"Super Admin","base_role":"admin","sidebar":["dashboard","my_tasks","projects","calendar","timelogs","billing","clients","team","announcements","notes","workload","activity","settings"],"permissions":["workspace:manage","workspace:delete","members:invite","members:manage_roles","members:remove","project:create","project:edit","project:delete","project:archive","task:create","task:edit","task:delete","task:move","announcement:create","note:create","note:edit","comment:create"]},{"key":"project_manager","name":"Project Manager","base_role":"project_manager","sidebar":["dashboard","my_tasks","projects","calendar","timelogs","clients","team","announcements","notes","workload","activity"],"permissions":["members:invite","project:create","project:edit","project:archive","task:create","task:edit","task:delete","task:move","announcement:create","note:create","note:edit","comment:create"]},{"key":"member","name":"Member","base_role":"member","sidebar":["dashboard","my_tasks","projects","calendar","timelogs","announcements","notes"],"permissions":["task:create","task:edit","task:move","note:create","note:edit","comment:create"]},{"key":"guest","name":"Guest","base_role":"guest","sidebar":["dashboard","projects","announcements","notes"],"permissions":["comment:create"]}]'::jsonb) r
  ON CONFLICT DO NOTHING;
$fn$;
REVOKE ALL ON FUNCTION private.seed_workspace_roles(uuid) FROM PUBLIC, anon, authenticated;
SELECT private.seed_workspace_roles(id) FROM public.workspaces;
INSERT INTO public.workspace_role_assignments(workspace_id,user_id,role_key)
SELECT m.workspace_id,m.user_id,CASE WHEN m.user_id=w.owner_id THEN 'owner'
  WHEN m.role IN ('admin','owner') THEN 'super_admin' ELSE m.role END
FROM public.workspace_members m JOIN public.workspaces w ON w.id=m.workspace_id
ON CONFLICT DO NOTHING;
INSERT INTO public.workspace_role_assignments(workspace_id,user_id,role_key)
SELECT id,owner_id,'owner' FROM public.workspaces WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- The authenticated identity is read from the session, never a client-supplied user id.
CREATE OR REPLACE FUNCTION private.workspace_access(target uuid, requested text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
   SELECT 1 FROM public.workspaces w WHERE w.id=target AND (
     w.owner_id=auth.uid() OR EXISTS (
       SELECT 1 FROM public.workspace_members m
       JOIN public.workspace_role_assignments a ON a.workspace_id=m.workspace_id AND a.user_id=m.user_id
       JOIN public.workspace_roles r ON r.workspace_id=a.workspace_id AND r.role_key=a.role_key
       WHERE m.workspace_id=target AND m.user_id=auth.uid() AND (
         requested='member' OR
         (requested='manage_roles' AND a.role_key='super_admin') OR
         (requested LIKE 'view:%' AND r.sidebar ? substring(requested FROM 6)) OR
         (requested NOT IN ('manage_roles','member') AND requested NOT LIKE 'view:%' AND r.permissions ? requested)
       )
     )
   )
 );
$fn$;
REVOKE ALL ON FUNCTION private.workspace_access(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.workspace_access(uuid,text) TO authenticated;

ALTER TABLE public.workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_role_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_roles,public.workspace_role_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.workspace_roles,public.workspace_role_assignments TO authenticated;
DROP POLICY IF EXISTS roles_read ON public.workspace_roles;
CREATE POLICY roles_read ON public.workspace_roles FOR SELECT TO authenticated USING (private.workspace_access(workspace_id,'member'));
DROP POLICY IF EXISTS roles_add ON public.workspace_roles;
CREATE POLICY roles_add ON public.workspace_roles FOR INSERT TO authenticated WITH CHECK (role_key <> 'owner' AND private.workspace_access(workspace_id,'manage_roles'));
DROP POLICY IF EXISTS roles_edit ON public.workspace_roles;
CREATE POLICY roles_edit ON public.workspace_roles FOR UPDATE TO authenticated USING (role_key <> 'owner' AND private.workspace_access(workspace_id,'manage_roles')) WITH CHECK (role_key <> 'owner' AND private.workspace_access(workspace_id,'manage_roles'));
DROP POLICY IF EXISTS assignments_read ON public.workspace_role_assignments;
CREATE POLICY assignments_read ON public.workspace_role_assignments FOR SELECT TO authenticated USING (private.workspace_access(workspace_id,'member'));
DROP POLICY IF EXISTS assignments_add ON public.workspace_role_assignments;
CREATE POLICY assignments_add ON public.workspace_role_assignments FOR INSERT TO authenticated WITH CHECK (
 private.workspace_access(workspace_id,'manage_roles') AND user_id <> auth.uid() AND role_key <> 'owner'
 AND EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id=workspace_role_assignments.workspace_id AND m.user_id=workspace_role_assignments.user_id)
 AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.owner_id=user_id));
DROP POLICY IF EXISTS assignments_edit ON public.workspace_role_assignments;
CREATE POLICY assignments_edit ON public.workspace_role_assignments FOR UPDATE TO authenticated USING (
 private.workspace_access(workspace_id,'manage_roles') AND user_id <> auth.uid() AND role_key <> 'owner'
) WITH CHECK (private.workspace_access(workspace_id,'manage_roles') AND user_id <> auth.uid() AND role_key <> 'owner'
 AND EXISTS (SELECT 1 FROM public.workspace_members m WHERE m.workspace_id=workspace_role_assignments.workspace_id AND m.user_id=workspace_role_assignments.user_id)
 AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.owner_id=user_id));

-- Keep identity columns immutable so an UPDATE cannot move privileges between users/workspaces.
CREATE OR REPLACE FUNCTION private.guard_role_identity() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
 IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'Workspace cannot be changed'; END IF;
 IF TG_TABLE_NAME='workspace_roles' THEN
 IF NEW.role_key IS DISTINCT FROM OLD.role_key THEN RAISE EXCEPTION 'Role key cannot be changed'; END IF;
 END IF;
 IF TG_TABLE_NAME='workspace_role_assignments' THEN
 IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'User cannot be changed'; END IF;
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS guard_role_identity ON public.workspace_roles;
CREATE TRIGGER guard_role_identity BEFORE UPDATE ON public.workspace_roles FOR EACH ROW EXECUTE FUNCTION private.guard_role_identity();
DROP TRIGGER IF EXISTS guard_assignment_identity ON public.workspace_role_assignments;
CREATE TRIGGER guard_assignment_identity BEFORE UPDATE ON public.workspace_role_assignments FOR EACH ROW EXECUTE FUNCTION private.guard_role_identity();

CREATE OR REPLACE FUNCTION private.initialize_workspace_roles() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
 PERFORM private.seed_workspace_roles(NEW.id);
 IF NEW.owner_id IS NOT NULL THEN
 INSERT INTO public.workspace_role_assignments VALUES (NEW.id,NEW.owner_id,'owner') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS initialize_workspace_roles ON public.workspaces;
CREATE TRIGGER initialize_workspace_roles AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION private.initialize_workspace_roles();
CREATE OR REPLACE FUNCTION private.initialize_member_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN
 DELETE FROM public.workspace_role_assignments WHERE workspace_id=OLD.workspace_id AND user_id=OLD.user_id;
 RETURN OLD;
 END IF;
 -- New invitations begin as Member; only the role manager can elevate access afterwards.
 INSERT INTO public.workspace_role_assignments(workspace_id,user_id,role_key)
 VALUES (NEW.workspace_id,NEW.user_id,CASE WHEN EXISTS(SELECT 1 FROM public.workspaces w WHERE w.id=NEW.workspace_id AND w.owner_id=NEW.user_id) THEN 'owner' ELSE 'member' END)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS initialize_member_role ON public.workspace_members;
CREATE TRIGGER initialize_member_role AFTER INSERT OR DELETE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION private.initialize_member_role();

-- Restrictive guards also apply when older permissive policies still exist.
-- Read access remains workspace-scoped; sidebar switches control pages, not field-level confidentiality.
DO $block$
DECLARE item record; operation text; expression text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('projects','project:create','project:edit','project:delete'),
 ('tasks','task:create','task:edit','task:delete'),
 ('notes','note:create','note:edit','note:edit'),
 ('announcements','announcement:create','announcement:create','announcement:create'),
 ('clients','project:create','project:edit','project:delete'),
 ('files','project:edit','project:edit','project:edit'),
 ('workspace_members','members:invite','manage_roles','members:remove')
 ) AS rules(table_name,insert_permission,update_permission,delete_permission)
 LOOP
  IF to_regclass('public.' || item.table_name) IS NULL THEN CONTINUE; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item.table_name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',item.table_name);
  FOREACH operation IN ARRAY ARRAY['select','insert','update','delete'] LOOP
   expression := format('private.workspace_access(workspace_id,%L)',CASE operation WHEN 'select' THEN 'member' WHEN 'insert' THEN item.insert_permission WHEN 'update' THEN item.update_permission ELSE item.delete_permission END);
   IF item.table_name='workspace_members' AND operation='update' THEN expression := 'false'; END IF;
   IF item.table_name='workspace_members' AND operation='delete' THEN expression := expression || ' AND NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id=workspace_id AND w.owner_id=user_id)'; END IF;
   EXECUTE format('DROP POLICY IF EXISTS rbac_%s ON public.%I',operation,item.table_name);
   EXECUTE format('CREATE POLICY rbac_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',operation,item.table_name,operation,
    CASE operation WHEN 'insert' THEN 'WITH CHECK ('||expression||')' WHEN 'update' THEN 'USING ('||expression||') WITH CHECK ('||expression||')' ELSE 'USING ('||expression||')' END);
  END LOOP;
 END LOOP;
END;
$block$;
-- Prevent a legacy permissive workspace policy from allowing ownership takeover.
CREATE OR REPLACE FUNCTION private.guard_workspace_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $fn$
BEGIN
 IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN RAISE EXCEPTION 'Ownership transfer requires an administrator migration'; END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS guard_workspace_owner ON public.workspaces;
CREATE TRIGGER guard_workspace_owner BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION private.guard_workspace_owner();
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspaces FROM anon;
DROP POLICY IF EXISTS rbac_read ON public.workspaces;
CREATE POLICY rbac_read ON public.workspaces AS RESTRICTIVE FOR SELECT TO authenticated USING (private.workspace_access(id,'member'));
DROP POLICY IF EXISTS rbac_insert ON public.workspaces;
CREATE POLICY rbac_insert ON public.workspaces AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id=(select auth.uid()));
DROP POLICY IF EXISTS rbac_update ON public.workspaces;
CREATE POLICY rbac_update ON public.workspaces AS RESTRICTIVE FOR UPDATE TO authenticated USING (private.workspace_access(id,'workspace:manage')) WITH CHECK (private.workspace_access(id,'workspace:manage'));
DROP POLICY IF EXISTS rbac_delete ON public.workspaces;
CREATE POLICY rbac_delete ON public.workspaces AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id=(select auth.uid()));
REVOKE ALL ON FUNCTION private.guard_role_identity(),private.initialize_workspace_roles(),private.initialize_member_role(),private.guard_workspace_owner() FROM PUBLIC,anon,authenticated;
COMMIT;

-- Verification: each workspace should have five built-in roles.
SELECT workspace_id,role_key,name FROM public.workspace_roles ORDER BY workspace_id,role_key;
