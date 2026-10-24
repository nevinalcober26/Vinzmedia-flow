-- Run after workspace_roles.sql and the timeclock scripts.
-- Safe to rerun. Weekly cutoff: Sunday 18:00 Asia/Dubai (14:00 UTC).
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('private.workspace_access(uuid,text)') IS NULL THEN
   RAISE EXCEPTION 'Run workspace_roles.sql first';
 END IF;
END $$;

-- Persist workspaces and automatically enroll their creator.
GRANT SELECT, INSERT ON public.workspaces TO authenticated;
DROP POLICY IF EXISTS workspace_creator_insert ON public.workspaces;
CREATE POLICY workspace_creator_insert ON public.workspaces FOR INSERT TO authenticated
WITH CHECK (owner_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS workspace_owner_read ON public.workspaces;
CREATE POLICY workspace_owner_read ON public.workspaces FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()));
CREATE OR REPLACE FUNCTION private.enroll_workspace_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.seed_workspace_roles(NEW.id);
 INSERT INTO public.workspace_members(workspace_id,user_id,role)
 VALUES(NEW.id,NEW.owner_id,'owner') ON CONFLICT(workspace_id,user_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.enroll_workspace_owner() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enroll_workspace_owner ON public.workspaces;
CREATE TRIGGER enroll_workspace_owner AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION private.enroll_workspace_owner();

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS color text DEFAULT 'yellow';
GRANT SELECT,INSERT,UPDATE ON public.notes TO authenticated;
DROP POLICY IF EXISTS notes_member_read ON public.notes;
CREATE POLICY notes_member_read ON public.notes FOR SELECT TO authenticated
USING(private.workspace_access(workspace_id,'member'));
DROP POLICY IF EXISTS notes_editor_update ON public.notes;
CREATE POLICY notes_editor_update ON public.notes FOR UPDATE TO authenticated
USING(private.workspace_access(workspace_id,'note:edit'))
WITH CHECK(private.workspace_access(workspace_id,'note:edit'));
DROP POLICY IF EXISTS notes_creator_insert ON public.notes;
CREATE POLICY notes_creator_insert ON public.notes FOR INSERT TO authenticated
WITH CHECK(author_id=(SELECT auth.uid()) AND private.workspace_access(workspace_id,'note:create'));

-- Atomic reaction toggle: clients may change only their own reaction.
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]';
CREATE OR REPLACE FUNCTION public.toggle_announcement_reaction(target_id uuid,reaction_emoji text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.announcements; existing jsonb; people jsonb; result jsonb; me text;
BEGIN
 me := auth.uid()::text;
 IF me IS NULL OR reaction_emoji NOT IN ('🎉','🚀','❤️','👀','👏','👍') THEN RAISE EXCEPTION 'Invalid reaction or sign-in required'; END IF;
 SELECT * INTO item FROM public.announcements WHERE id=target_id FOR UPDATE;
 IF NOT FOUND OR NOT private.workspace_access(item.workspace_id,'member') THEN RAISE EXCEPTION 'Workspace access required'; END IF;
 SELECT value INTO existing FROM jsonb_array_elements(coalesce(item.reactions,'[]')) WHERE value->>'emoji'=reaction_emoji;
 people := coalesce(existing->'user_ids','[]');
 IF people ? me THEN
   SELECT coalesce(jsonb_agg(value),'[]') INTO people FROM jsonb_array_elements(people) WHERE value <> to_jsonb(me);
 ELSE people := people || jsonb_build_array(me);
 END IF;
 SELECT coalesce(jsonb_agg(value),'[]') INTO result FROM jsonb_array_elements(coalesce(item.reactions,'[]')) WHERE value->>'emoji'<>reaction_emoji;
 IF jsonb_array_length(people)>0 THEN result := result || jsonb_build_array(jsonb_build_object('emoji',reaction_emoji,'user_ids',people,'count',jsonb_array_length(people))); END IF;
 UPDATE public.announcements SET reactions=result WHERE id=target_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.toggle_announcement_reaction(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.toggle_announcement_reaction(uuid,text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.weekly_time_reviews(
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 week_start date NOT NULL CHECK(extract(isodow FROM week_start)=1),
 duration_seconds bigint NOT NULL,
 entry_count integer NOT NULL,
 finalized_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(project_id,user_id,week_start)
);
CREATE INDEX IF NOT EXISTS weekly_time_reviews_workspace_user_idx ON public.weekly_time_reviews(workspace_id,user_id);
ALTER TABLE public.weekly_time_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.weekly_time_reviews FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.weekly_time_reviews TO authenticated;
DROP POLICY IF EXISTS own_weekly_reviews ON public.weekly_time_reviews;
CREATE POLICY own_weekly_reviews ON public.weekly_time_reviews FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) AND private.workspace_access(workspace_id,'member'));

CREATE OR REPLACE FUNCTION public.finalize_weekly_time_review(target_project uuid, target_week date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ws uuid; seconds bigint; entries integer;
BEGIN
 SELECT workspace_id INTO ws FROM public.projects WHERE id=target_project;
 IF auth.uid() IS NULL OR ws IS NULL OR NOT private.workspace_access(ws,'view:timelogs') THEN RAISE EXCEPTION 'Time tracking access required'; END IF;
 IF extract(isodow FROM target_week)<>1 OR target_week > (now() AT TIME ZONE 'Asia/Dubai')::date THEN RAISE EXCEPTION 'Invalid review week'; END IF;
 SELECT coalesce(sum(duration_seconds),0),count(*) INTO seconds,entries FROM public.time_entries
 WHERE project_id=target_project AND workspace_id=ws AND user_id=auth.uid()
 AND (started_at AT TIME ZONE 'Asia/Dubai')::date >= target_week
 AND (started_at AT TIME ZONE 'Asia/Dubai')::date < target_week+7;
 IF entries=0 THEN RAISE EXCEPTION 'No time entries to review'; END IF;
 INSERT INTO public.weekly_time_reviews VALUES(ws,target_project,auth.uid(),target_week,seconds,entries,now())
 ON CONFLICT(project_id,user_id,week_start) DO UPDATE SET duration_seconds=excluded.duration_seconds,entry_count=excluded.entry_count,finalized_at=excluded.finalized_at;
 UPDATE public.notifications SET is_read=true WHERE user_id=auth.uid() AND workspace_id=ws
 AND link_url='/timelogs?project='||target_project::text||'&week='||target_week::text;
END $$;
REVOKE ALL ON FUNCTION public.finalize_weekly_time_review(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalize_weekly_time_review(uuid,date) TO authenticated;

-- Editing, adding or deleting time invalidates the corresponding saved review.
CREATE OR REPLACE FUNCTION private.invalidate_time_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP <> 'INSERT' THEN
 DELETE FROM public.weekly_time_reviews WHERE project_id=OLD.project_id AND user_id=OLD.user_id
 AND week_start=date_trunc('week',OLD.started_at AT TIME ZONE 'Asia/Dubai')::date;
 END IF;
 IF TG_OP <> 'DELETE' THEN
 DELETE FROM public.weekly_time_reviews WHERE project_id=NEW.project_id AND user_id=NEW.user_id
 AND week_start=date_trunc('week',NEW.started_at AT TIME ZONE 'Asia/Dubai')::date;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.invalidate_time_review() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS invalidate_time_review ON public.time_entries;
CREATE TRIGGER invalidate_time_review AFTER INSERT OR UPDATE OR DELETE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION private.invalidate_time_review();

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_idx ON public.notifications(user_id,dedupe_key);
GRANT SELECT,UPDATE,DELETE ON public.notifications TO authenticated;
DROP POLICY IF EXISTS notification_own_delete ON public.notifications;
CREATE POLICY notification_own_delete ON public.notifications FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notification_reader_guard ON public.notifications;
CREATE POLICY notification_reader_guard ON public.notifications AS RESTRICTIVE FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) AND private.workspace_access(workspace_id,'member'));
DROP POLICY IF EXISTS notification_update_guard ON public.notifications;
CREATE POLICY notification_update_guard ON public.notifications AS RESTRICTIVE FOR UPDATE TO authenticated
USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notification_delete_guard ON public.notifications;
CREATE POLICY notification_delete_guard ON public.notifications AS RESTRICTIVE FOR DELETE TO authenticated
USING(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notification_own_read ON public.notifications;
CREATE POLICY notification_own_read ON public.notifications FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS notification_own_update ON public.notifications;
CREATE POLICY notification_own_update ON public.notifications FOR UPDATE TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION private.send_weekly_time_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE week_date date := date_trunc('week',now() AT TIME ZONE 'Asia/Dubai')::date;
BEGIN
 INSERT INTO public.notifications(user_id,workspace_id,title,message,type,link_url,is_read,dedupe_key)
 SELECT e.user_id,e.workspace_id,'Finalize weekly summary · '||p.name,
 'Review your tasks, work summaries and time for '||to_char(week_date,'Mon DD')||' – '||to_char(week_date+6,'Mon DD')||'.',
 'system','/timelogs?project='||p.id::text||'&week='||week_date::text,false,'weekly-time:'||p.id::text||':'||week_date::text
 FROM public.time_entries e JOIN public.projects p ON p.id=e.project_id AND p.workspace_id=e.workspace_id
 JOIN public.workspaces w ON w.id=e.workspace_id
 WHERE (e.started_at AT TIME ZONE 'Asia/Dubai')::date >= week_date
 AND (e.started_at AT TIME ZONE 'Asia/Dubai')::date < week_date+7
 AND (w.owner_id=e.user_id OR EXISTS(
   SELECT 1 FROM public.workspace_members m
   JOIN public.workspace_role_assignments a ON a.workspace_id=m.workspace_id AND a.user_id=m.user_id
   JOIN public.workspace_roles r ON r.workspace_id=a.workspace_id AND r.role_key=a.role_key
   WHERE m.workspace_id=e.workspace_id AND m.user_id=e.user_id AND r.sidebar ? 'timelogs'
 ))
 AND NOT EXISTS(SELECT 1 FROM public.weekly_time_reviews r WHERE r.project_id=p.id AND r.user_id=e.user_id AND r.week_start=week_date)
 GROUP BY e.user_id,e.workspace_id,p.id,p.name
 ON CONFLICT(user_id,dedupe_key) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION private.send_weekly_time_reminders() FROM PUBLIC,anon,authenticated;
COMMIT;

-- SCHEDULER: enable Supabase Cron and schedule the reminder even when the app is closed.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('vinzflow-weekly-time-review','0 14 * * 0','SELECT private.send_weekly_time_reminders()');
NOTIFY pgrst,'reload schema';

SELECT jobname,schedule,active FROM cron.job WHERE jobname='vinzflow-weekly-time-review';
