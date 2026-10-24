-- Run after workspace_roles.sql. No project/task table is opened to anonymous readers.
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS private.project_board_shares (
 project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
 token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 enabled boolean NOT NULL DEFAULT true,
 password_hash text,
 attempt_window timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE private.project_board_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.project_board_shares FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.manage_project_board_share(target_project uuid, operation text DEFAULT 'get', share_password text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ws uuid; s private.project_board_shares;
BEGIN
 SELECT workspace_id INTO ws FROM public.projects WHERE id=target_project;
 IF auth.uid() IS NULL OR ws IS NULL OR NOT private.workspace_access(ws,'manage_roles') THEN
  RAISE EXCEPTION 'Only workspace Owners and Admins can manage board sharing';
 END IF;
 IF operation NOT IN ('get','public','password','disable') THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 IF operation='password' AND (share_password IS NULL OR length(share_password)<12 OR octet_length(share_password)>72) THEN
  RAISE EXCEPTION 'Use a password of at least 12 characters and at most 72 bytes';
 END IF;
 IF operation IN ('public','password') THEN
  INSERT INTO private.project_board_shares(project_id,password_hash)
  VALUES(target_project, CASE WHEN operation='password' THEN extensions.crypt(share_password,extensions.gen_salt('bf',10)) END)
  ON CONFLICT(project_id) DO UPDATE SET enabled=true,
   password_hash=excluded.password_hash, token=gen_random_uuid(), attempts=0, attempt_window=now();
 ELSIF operation='disable' THEN
  UPDATE private.project_board_shares SET enabled=false WHERE project_id=target_project;
 END IF;
 SELECT * INTO s FROM private.project_board_shares WHERE project_id=target_project;
 RETURN jsonb_build_object('enabled',coalesce(s.enabled,false),'token',s.token,'protected',s.password_hash IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.manage_project_board_share(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_project_board_share(uuid,text,text) TO authenticated;

-- Deliberate public read API: possession of the random token plus the password (if set)
-- authorizes only this allowlisted projection. Never return complete task/project rows.
CREATE OR REPLACE FUNCTION public.read_shared_project_board(share_token uuid, share_password text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s private.project_board_shares; result jsonb;
BEGIN
 SELECT * INTO s FROM private.project_board_shares WHERE token=share_token AND enabled FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('state','unavailable'); END IF;
 IF s.password_hash IS NOT NULL THEN
  IF share_password IS NULL THEN RETURN jsonb_build_object('state','password'); END IF;
  IF octet_length(share_password)>72 THEN RETURN jsonb_build_object('state','incorrect'); END IF;
  IF s.attempt_window < now()-interval '1 minute' THEN
   s.attempts:=0;
   UPDATE private.project_board_shares SET attempts=0,attempt_window=now() WHERE project_id=s.project_id;
  END IF;
  IF s.attempts>=20 THEN RETURN jsonb_build_object('state','limited'); END IF;
  UPDATE private.project_board_shares SET attempts=attempts+1 WHERE project_id=s.project_id;
  IF extensions.crypt(share_password,s.password_hash)<>s.password_hash THEN RETURN jsonb_build_object('state','incorrect'); END IF;
 END IF;
 SELECT jsonb_build_object('state','ready','name',p.name,'tasks',coalesce((
  SELECT jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'status',t.status,'due_date',t.due_date) ORDER BY t.order_index,t.created_at)
  FROM public.tasks t WHERE t.project_id=p.id AND t.workspace_id=p.workspace_id
 ),'[]'::jsonb)) INTO result FROM public.projects p WHERE p.id=s.project_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_shared_project_board(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_shared_project_board(uuid,text) TO anon,authenticated;
COMMIT;
