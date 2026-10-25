-- Run this ENTIRE file in Supabase SQL Editor after team_approval_required.sql.
-- This repairs the two registrations reported by the workspace owner.
-- It does not activate members. Owner/Admin approval is still required.
BEGIN;
CREATE TEMP TABLE repaired_team_requests(workspace_id uuid,user_id uuid,email text,result text) ON COMMIT DROP;
DO $$
DECLARE
 target_workspace uuid;
 candidates uuid[];
 person auth.users;
 owner_uuid uuid;
BEGIN
 SELECT id INTO owner_uuid FROM public.profiles WHERE lower(email)='vinz@vinzmedia.com';
 IF owner_uuid IS NULL THEN RAISE EXCEPTION 'Workspace owner profile not found; no records changed'; END IF;
 -- Use invitation evidence for the reported accounts when it identifies one workspace.
 SELECT array_agg(DISTINCT w.id) INTO candidates
 FROM public.workspaces w JOIN public.workspace_invites i ON i.workspace_id=w.id
 WHERE w.owner_id=owner_uuid AND lower(i.email) IN ('nevinvinz@gmail.com','marice.cervs@gmail.com');
 IF coalesce(cardinality(candidates),0)=0 THEN
  SELECT array_agg(id) INTO candidates FROM public.workspaces WHERE owner_id=owner_uuid;
 END IF;
 IF coalesce(cardinality(candidates),0)<>1 THEN
  RAISE EXCEPTION 'Cannot safely identify one workspace. No changes made. Workspace candidates: %',candidates;
 END IF;
 target_workspace:=candidates[1];
 IF (SELECT count(*) FROM auth.users WHERE lower(email) IN ('nevinvinz@gmail.com','marice.cervs@gmail.com'))<>2 THEN
  RAISE EXCEPTION 'Both reported Auth accounts must exist. Check email spelling; no changes made';
 END IF;
 FOR person IN SELECT * FROM auth.users WHERE lower(email) IN ('nevinvinz@gmail.com','marice.cervs@gmail.com') LOOP
  IF person.id=owner_uuid THEN RAISE EXCEPTION 'Cannot queue the workspace owner'; END IF;
  IF EXISTS(SELECT 1 FROM public.workspace_members WHERE workspace_id=target_workspace AND user_id=person.id) THEN
   INSERT INTO repaired_team_requests VALUES(target_workspace,person.id,person.email,'already a member — preserved');
   CONTINUE;
  END IF;
  INSERT INTO public.profiles(id,email,full_name,role,status,approval_status)
  VALUES(person.id,person.email,coalesce(person.raw_user_meta_data->>'full_name',split_part(person.email,'@',1)),'member','offline','pending')
  ON CONFLICT(id) DO NOTHING;
  UPDATE public.profiles SET approval_status='pending' WHERE id=person.id
   AND NOT EXISTS(SELECT 1 FROM public.workspace_members WHERE user_id=person.id)
   AND NOT EXISTS(SELECT 1 FROM public.workspaces WHERE owner_id=person.id);
  INSERT INTO public.workspace_join_requests(workspace_id,user_id,requested_role,status,reviewed_by)
  VALUES(target_workspace,person.id,'member','pending',NULL)
  ON CONFLICT(workspace_id,user_id) DO UPDATE SET status='pending',reviewed_by=NULL;
  INSERT INTO repaired_team_requests VALUES(target_workspace,person.id,person.email,'pending — awaiting Owner/Admin approval');
 END LOOP;
END $$;
SELECT w.name AS workspace, r.email, r.result
FROM repaired_team_requests r JOIN public.workspaces w ON w.id=r.workspace_id ORDER BY r.email;
COMMIT;
