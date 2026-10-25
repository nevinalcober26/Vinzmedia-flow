-- Run after team_approval_required.sql. Preserves existing accounts and requires admin approval.
BEGIN;
CREATE OR REPLACE FUNCTION public.request_workspace_join(invite_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actual_email text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
 SELECT email INTO actual_email FROM auth.users WHERE id=auth.uid();
 -- Earlier failed registrations may have an Auth account without a public profile.
 -- Recreate only the signed-in user's profile; never grant membership here.
 INSERT INTO public.profiles(id,email,full_name,role,status,approval_status)
 SELECT id,email,coalesce(raw_user_meta_data->>'full_name',split_part(email,'@',1)), 'member','offline','pending'
 FROM auth.users WHERE id=auth.uid()
 ON CONFLICT(id) DO NOTHING;
 PERFORM private.queue_workspace_join(auth.uid(),actual_email,invite_token);
END $$;
REVOKE ALL ON FUNCTION public.request_workspace_join(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_workspace_join(text) TO authenticated;

COMMIT;
