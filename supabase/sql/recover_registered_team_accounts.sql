-- Run after team_approval_required.sql. This adds an Owner/Admin-only recovery action.
BEGIN;
CREATE OR REPLACE FUNCTION public.queue_registered_team_account(target_workspace uuid, account_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE account auth.users; existing_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.workspace_access(target_workspace,'manage_roles') THEN
  RAISE EXCEPTION 'Only the workspace Owner or Admin can recover a registration';
 END IF;
 SELECT * INTO account FROM auth.users WHERE lower(email)=lower(trim(account_email));
 IF NOT FOUND THEN RAISE EXCEPTION 'No registered account was found for this email. Send an invitation first.'; END IF;
 IF account.id=auth.uid() OR EXISTS(SELECT 1 FROM public.workspaces WHERE id=target_workspace AND owner_id=account.id) THEN RAISE EXCEPTION 'The workspace owner or your own account cannot be queued'; END IF;
 IF EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=target_workspace AND user_id=account.id) THEN
  RETURN 'already_active';
 END IF;
 INSERT INTO public.profiles(id,email,full_name,role,status,approval_status)
 VALUES(account.id,account.email,coalesce(account.raw_user_meta_data->>'full_name',split_part(account.email,'@',1)),'member','offline','pending')
 ON CONFLICT(id) DO NOTHING;
 -- Preserve access to any other workspace. Accounts without any workspace remain blocked from app login.
 UPDATE public.profiles SET approval_status='pending' WHERE id=account.id
 AND NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE user_id=account.id)
 AND NOT EXISTS(SELECT 1 FROM public.workspaces WHERE owner_id=account.id);
 INSERT INTO public.workspace_join_requests(workspace_id,user_id,requested_role,status,reviewed_by)
 VALUES(target_workspace,account.id,'member','pending',NULL)
 ON CONFLICT(workspace_id,user_id) DO UPDATE SET status='pending',reviewed_by=NULL;
 RETURN 'pending';
END $$;
REVOKE ALL ON FUNCTION public.queue_registered_team_account(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_registered_team_account(uuid,text) TO authenticated;
COMMIT;
