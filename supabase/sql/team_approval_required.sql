-- Run after workspace_roles.sql and migration 004 (invites).
BEGIN;
CREATE TABLE IF NOT EXISTS public.workspace_join_requests (
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 requested_role text NOT NULL DEFAULT 'member' CHECK(requested_role IN ('admin','project_manager','member','guest')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewed_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,user_id)
);
ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_join_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.workspace_join_requests TO authenticated;
DROP POLICY IF EXISTS join_requests_read ON public.workspace_join_requests;
CREATE POLICY join_requests_read ON public.workspace_join_requests FOR SELECT TO authenticated
 USING(user_id=auth.uid() OR private.workspace_access(workspace_id,'manage_roles'));
CREATE INDEX IF NOT EXISTS join_requests_pending_idx ON public.workspace_join_requests(workspace_id,status,created_at);

-- Old broad policies must never authorize invitation management or profile approval.
DROP POLICY IF EXISTS "Public invite token lookup" ON public.workspace_invites;
DROP POLICY IF EXISTS "Workspace members can manage invites" ON public.workspace_invites;
DROP POLICY IF EXISTS "Allow approval updates on profiles" ON public.profiles;
REVOKE ALL ON public.workspace_invites FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workspace_invites TO authenticated;
DROP POLICY IF EXISTS invite_managers ON public.workspace_invites;
CREATE POLICY invite_managers ON public.workspace_invites FOR ALL TO authenticated
 USING(private.workspace_access(workspace_id,'manage_roles')) WITH CHECK(private.workspace_access(workspace_id,'manage_roles'));
DROP POLICY IF EXISTS invite_manager_guard ON public.workspace_invites;
CREATE POLICY invite_manager_guard ON public.workspace_invites AS RESTRICTIVE FOR ALL TO authenticated
 USING(private.workspace_access(workspace_id,'manage_roles')) WITH CHECK(private.workspace_access(workspace_id,'manage_roles'));

CREATE OR REPLACE FUNCTION public.lookup_workspace_invite(invite_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',id,'workspace_id',workspace_id,'token',token,'role',role,'email',email,'status',status,'expires_at',expires_at,'created_at',created_at)
 FROM public.workspace_invites WHERE token=invite_token AND status='pending' AND expires_at>now();
$$;
REVOKE ALL ON FUNCTION public.lookup_workspace_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_workspace_invite(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION private.queue_workspace_join(target_user uuid, user_email text, invite_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inv public.workspace_invites;
BEGIN
 SELECT * INTO inv FROM public.workspace_invites WHERE token=invite_token AND status='pending' AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR (coalesce(inv.email,'')<>'' AND lower(inv.email)<>lower(user_email)) THEN RAISE EXCEPTION 'Invitation is invalid, expired, or belongs to another email'; END IF;
 IF EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=inv.workspace_id AND user_id=target_user) THEN RAISE EXCEPTION 'You are already a member of this workspace'; END IF;
 INSERT INTO public.workspace_join_requests(workspace_id,user_id,requested_role)
 VALUES(inv.workspace_id,target_user,CASE WHEN inv.role='owner' THEN 'member' ELSE inv.role END)
 ON CONFLICT(workspace_id,user_id) DO UPDATE SET status='pending',requested_role=excluded.requested_role,reviewed_by=NULL;
 -- Each invitation is single-use, including invitations without a fixed email.
 UPDATE public.workspace_invites SET status='accepted',email=lower(user_email) WHERE id=inv.id;
END $$;
REVOKE ALL ON FUNCTION private.queue_workspace_join(uuid,text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.request_workspace_join(invite_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actual_email text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT email INTO actual_email FROM auth.users WHERE id=auth.uid();
 PERFORM private.queue_workspace_join(auth.uid(),actual_email,invite_token);
END $$;
REVOKE ALL ON FUNCTION public.request_workspace_join(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_workspace_join(text) TO authenticated;

-- Signup NEVER enrolls someone in an existing workspace. Metadata cannot grant roles.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE invite_token text := nullif(NEW.raw_user_meta_data->>'invite_token','');
BEGIN
 INSERT INTO public.profiles(id,email,full_name,username,role,status,approval_status)
 VALUES(NEW.id,NEW.email,coalesce(NEW.raw_user_meta_data->>'full_name',split_part(NEW.email,'@',1)),nullif(NEW.raw_user_meta_data->>'username',''),'member','offline',CASE WHEN invite_token IS NULL THEN 'approved' ELSE 'pending' END);
 IF invite_token IS NOT NULL THEN PERFORM private.queue_workspace_join(NEW.id,NEW.email,invite_token); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Block direct membership insertion, including calls made by admins, until reviewed.
-- The actual creator of a new workspace may enroll in their own workspace.
CREATE OR REPLACE FUNCTION private.require_member_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.workspaces WHERE id=NEW.workspace_id AND owner_id=NEW.user_id) THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workspace_join_requests WHERE workspace_id=NEW.workspace_id AND user_id=NEW.user_id AND status='approved') THEN
  RAISE EXCEPTION 'Administrator approval is required before adding a workspace member';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS require_member_approval ON public.workspace_members;
CREATE TRIGGER require_member_approval BEFORE INSERT OR UPDATE OF user_id,workspace_id ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION private.require_member_approval();

CREATE OR REPLACE FUNCTION private.protect_profile_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('anon','authenticated') AND (TG_OP='INSERT' OR NEW.approval_status IS DISTINCT FROM OLD.approval_status OR NEW.role IS DISTINCT FROM OLD.role) THEN
  RAISE EXCEPTION 'Profile approval and roles are managed by the server';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_approval ON public.profiles;
CREATE TRIGGER protect_profile_approval BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile_approval();

CREATE OR REPLACE FUNCTION public.review_workspace_join(target_workspace uuid, target_user uuid, approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE request public.workspace_join_requests;
BEGIN
 IF auth.uid() IS NULL OR NOT private.workspace_access(target_workspace,'manage_roles') OR auth.uid()=target_user THEN RAISE EXCEPTION 'Only an Owner or Admin can review another member'; END IF;
 SELECT * INTO request FROM public.workspace_join_requests WHERE workspace_id=target_workspace AND user_id=target_user AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This request is no longer pending'; END IF;
 UPDATE public.workspace_join_requests SET status=CASE WHEN approve THEN 'approved' ELSE 'rejected' END,reviewed_by=auth.uid() WHERE workspace_id=target_workspace AND user_id=target_user;
 IF approve THEN
  INSERT INTO public.workspace_members(workspace_id,user_id,role) VALUES(target_workspace,target_user,request.requested_role);
  UPDATE public.workspace_role_assignments SET role_key=CASE WHEN request.requested_role='admin' THEN 'super_admin' ELSE request.requested_role END WHERE workspace_id=target_workspace AND user_id=target_user;
  UPDATE public.profiles SET approval_status='approved' WHERE id=target_user;
 END IF;
 UPDATE public.workspace_invites SET status=CASE WHEN approve THEN 'approved' ELSE 'rejected' END
 WHERE workspace_id=target_workspace AND status='accepted' AND lower(email)=(SELECT lower(email) FROM public.profiles WHERE id=target_user);
END $$;
REVOKE ALL ON FUNCTION public.review_workspace_join(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_workspace_join(uuid,uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.pending_workspace_joins(target_workspace uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.workspace_access(target_workspace,'manage_roles') THEN RETURN '[]'::jsonb; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'email',p.email,'full_name',p.full_name,'username',p.username,'role',r.requested_role,'approval_status','pending','status','offline','created_at',r.created_at) ORDER BY r.created_at)
 FROM public.workspace_join_requests r JOIN public.profiles p ON p.id=r.user_id WHERE r.workspace_id=target_workspace AND r.status='pending'),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.pending_workspace_joins(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pending_workspace_joins(uuid) TO authenticated;
-- Recover only explicitly pending legacy applicants; existing approved members stay active.
INSERT INTO public.workspace_join_requests(workspace_id,user_id,requested_role)
SELECT DISTINCT i.workspace_id,p.id,CASE WHEN i.role='owner' THEN 'member' ELSE i.role END
FROM public.workspace_invites i JOIN public.profiles p ON lower(p.email)=lower(i.email)
JOIN public.workspaces w ON w.id=i.workspace_id
WHERE p.approval_status='pending' AND i.status='accepted' AND w.owner_id<>p.id
ON CONFLICT(workspace_id,user_id) DO NOTHING;
INSERT INTO public.workspace_join_requests(workspace_id,user_id,requested_role)
SELECT m.workspace_id,m.user_id,CASE WHEN m.role='owner' THEN 'member' ELSE m.role END
FROM public.workspace_members m JOIN public.profiles p ON p.id=m.user_id JOIN public.workspaces w ON w.id=m.workspace_id
WHERE p.approval_status='pending' AND w.owner_id<>m.user_id
ON CONFLICT(workspace_id,user_id) DO NOTHING;
DELETE FROM public.workspace_members m USING public.workspace_join_requests r,public.profiles p,public.workspaces w
WHERE m.workspace_id=r.workspace_id AND m.user_id=r.user_id AND p.id=m.user_id AND w.id=m.workspace_id
AND r.status='pending' AND p.approval_status='pending' AND w.owner_id<>m.user_id;
COMMIT;
