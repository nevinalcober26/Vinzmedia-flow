-- ====================================================================
-- PROJECT MANAGEMENT & TEAM COLLABORATION PLATFORM
-- Production-Ready Supabase PostgreSQL Schema, Realtime & Dynamic Triggers
-- ====================================================================

-- Enable cryptographic extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES & WORKSPACES
-- ====================================================================

-- 1. Profiles Table (Synced dynamically with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'guest')),
  title TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'busy', 'away', 'offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Workspace Members (RBAC Mapping)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'guest')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(workspace_id, user_id)
);

-- ====================================================================
-- 2. CLIENTS & MULTI-PROJECT MEDIA ASSETS
-- ====================================================================

-- 4. Clients Directory
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'lead', 'past')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'FolderKanban',
  color TEXT DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE,
  target_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Client Project Association Table
CREATE TABLE IF NOT EXISTS public.client_projects (
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (client_id, project_id)
);

-- 7. Project Memberships
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(project_id, user_id)
);

-- 8. Project & Client Media Files (PDFs, Word Docs, Sheets, Images)
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- 3. TASKS, KANBAN, CHECKLISTS & ACTIVITY
-- ====================================================================

-- 9. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  order_index INTEGER NOT NULL DEFAULT 0,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE,
  due_date DATE,
  labels TEXT[] DEFAULT '{}',
  estimated_hours NUMERIC(6, 2) DEFAULT 0,
  tracked_seconds INTEGER DEFAULT 0,
  is_timer_running BOOLEAN DEFAULT false,
  dependencies UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Task Assignees (Many to Many)
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(task_id, user_id)
);

-- 11. Subtasks & Checklists
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Task Comments & Reactions
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 13. Project Milestones
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Quick Notes (Notion-style scratchpad)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. Team Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'general' CHECK (priority IN ('urgent', 'important', 'general')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  read_by UUID[] DEFAULT '{}',
  reactions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. In-App Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'mention', 'comment', 'deadline', 'status_change', 'announcement', 'system')),
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Real-Time Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- 4. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_client_id ON public.files(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON public.notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON public.activity_logs(workspace_id);

-- ====================================================================
-- 5. STORAGE BUCKET FOR MEDIA, PDFS & WORD DOCS
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for instant file access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for project-files'
  ) THEN
    CREATE POLICY "Public Access for project-files" ON storage.objects FOR SELECT USING (bucket_id = 'project-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Uploads for project-files'
  ) THEN
    CREATE POLICY "Public Uploads for project-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Mutate for project-files'
  ) THEN
    CREATE POLICY "Public Mutate for project-files" ON storage.objects FOR ALL USING (bucket_id = 'project-files');
  END IF;
END $$;

-- ====================================================================
-- 6. DYNAMIC AUTOMATION TRIGGERS
-- ====================================================================

-- A. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workspaces ON public.workspaces;
CREATE TRIGGER set_updated_at_workspaces BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_projects ON public.projects;
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tasks ON public.tasks;
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_notes ON public.notes;
CREATE TRIGGER set_updated_at_notes BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_clients ON public.clients;
CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- B. Dynamically Recalculate Project Completion Percentage on Task Changes
CREATE OR REPLACE FUNCTION public.recalculate_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  target_proj_id UUID;
  total_tasks INT;
  completed_tasks INT;
  new_percentage INT;
BEGIN
  target_proj_id := COALESCE(NEW.project_id, OLD.project_id);
  IF target_proj_id IS NOT NULL THEN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
    INTO total_tasks, completed_tasks
    FROM public.tasks
    WHERE project_id = target_proj_id;

    IF total_tasks > 0 THEN
      new_percentage := ROUND((completed_tasks::numeric / total_tasks::numeric) * 100);
    ELSE
      new_percentage := 0;
    END IF;

    UPDATE public.projects
    SET progress = new_percentage, updated_at = now()
    WHERE id = target_proj_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_project_progress ON public.tasks;
CREATE TRIGGER trg_recalculate_project_progress
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_project_progress();

-- C. Dynamically sync new Supabase Auth users to public.profiles and default workspace
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  default_workspace_id UUID;
  user_name TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    'online'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  -- Assign user to the default workspace
  SELECT id INTO default_workspace_id FROM public.workspaces LIMIT 1;
  IF default_workspace_id IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (default_workspace_id, NEW.id, 'member')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- D. Dynamic Activity Logger on Task Events
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (workspace_id, project_id, task_id, user_id, action, details)
    VALUES (NEW.workspace_id, NEW.project_id, NEW.id, COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000001'::uuid), 'created_task', 'Created task: "' || NEW.title || '"');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_logs (workspace_id, project_id, task_id, user_id, action, details)
    VALUES (NEW.workspace_id, NEW.project_id, NEW.id, COALESCE(NEW.creator_id, '00000000-0000-0000-0000-000000000001'::uuid), 'updated_status', 'Moved task "' || NEW.title || '" to ' || REPLACE(NEW.status, '_', ' '));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;
CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

-- ====================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Dynamic transparent access policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for %s" ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Enable all access for %s" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ====================================================================
-- 8. REALTIME LIVE WEBSOCKET SUBSCRIPTIONS
-- ====================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ====================================================================
-- 9. DYNAMIC INITIAL STARTER SEED DATA
-- ====================================================================

-- 1. Profiles
INSERT INTO public.profiles (id, email, full_name, avatar_url, role, title, department, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alex.rivera@acme.inc', 'Alex Rivera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'owner', 'Head of Product', 'Product & Design', 'online'),
  ('00000000-0000-0000-0000-000000000002', 'sarah.chen@acme.inc', 'Sarah Chen', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'admin', 'Lead Architect', 'Engineering', 'busy'),
  ('00000000-0000-0000-0000-000000000003', 'marcus.vance@acme.inc', 'Marcus Vance', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'project_manager', 'Senior Technical PM', 'Operations', 'online'),
  ('00000000-0000-0000-0000-000000000004', 'elena.rostova@acme.inc', 'Elena Rostova', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'member', 'Staff Frontend Engineer', 'Engineering', 'away'),
  ('00000000-0000-0000-0000-000000000005', 'david.kim@acme.inc', 'David Kim', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'guest', 'External Design Auditor', 'Design Ops', 'offline')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 2. Workspaces
INSERT INTO public.workspaces (id, name, slug, logo_url, description, owner_id, plan)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Acme Global HQ', 'acme-global', NULL, 'Central product, engineering, and enterprise clients workspace', '00000000-0000-0000-0000-000000000001', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- 3. Workspace Members
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'project_manager'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'guest')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 4. Clients
INSERT INTO public.clients (id, workspace_id, name, company, email, status)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Jonathan Sterling', 'Nexus Financial Group', 'j.sterling@nexusfin.com', 'active'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Dr. Beatrice Thorne', 'Aether Health Technologies', 'beatrice@aetherhealth.io', 'active'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Liam Gallagher', 'Horizon Logistics Network', 'liam@horizonlogistics.co', 'lead')
ON CONFLICT (id) DO NOTHING;

-- 5. Projects
INSERT INTO public.projects (id, workspace_id, name, description, icon, color, status, priority, owner_id, start_date, target_date, progress)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Mobile App Redesign (iOS & Android)', 'Comprehensive UX overhaul of our core mobile application featuring modern biometric auth and offline cache synchronization.', 'Smartphone', '#6366f1', 'active', 'urgent', '00000000-0000-0000-0000-000000000001', '2026-03-01', '2026-06-30', 68),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Cloud Infrastructure Migration', 'Multi-region Kubernetes deployment, zero-downtime PostgreSQL partitioning, and automated telemetry alerts.', 'Server', '#10b981', 'active', 'high', '00000000-0000-0000-0000-000000000002', '2026-02-15', '2026-05-15', 45),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Design System v2.0 & Tokens', 'Cross-platform tokenized design tokens, accessible React component primitives, and Figma token syncing.', 'Palette', '#ec4899', 'planning', 'medium', '00000000-0000-0000-0000-000000000004', '2026-04-01', '2026-08-31', 20)
ON CONFLICT (id) DO NOTHING;

-- 6. Client Project Associations
INSERT INTO public.client_projects (client_id, project_id)
VALUES
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002')
ON CONFLICT (client_id, project_id) DO NOTHING;

-- 7. Media Files (PDFs, Word Docs, Sheets, Images)
INSERT INTO public.files (id, workspace_id, name, size, type, url, project_id, client_id, uploaded_by)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Nexus_Mobile_Architecture_Spec_v3.pdf', 4823449, 'application/pdf', 'https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Client_Services_Master_Agreement_Nexus.docx', 1843200, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'https://calibre-ebook.com/downloads/demos/demo.docx', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Aether_Cloud_Cost_Projections_2026.xlsx', 924300, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'https://file-examples.com/storage/fe9452b1be662998a1a3641/2017/02/file_example_XLSX_100.xlsx', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Mobile_Figma_Design_Explorations.png', 3245600, 'image/png', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- 8. Tasks
INSERT INTO public.tasks (id, workspace_id, project_id, title, description, status, priority, order_index, creator_id, start_date, due_date, labels, estimated_hours)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Biometric FaceID & TouchID Authentication Module', 'Implement secure biometric hardware enclave unlocking using Keychain and React Native TurboModules.', 'in_progress', 'urgent', 0, '00000000-0000-0000-0000-000000000001', '2026-04-01', '2026-04-20', ARRAY['Security', 'Mobile', 'iOS'], 24),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Offline SQLite Database Synchronization Layer', 'Implement differential change tracking and sync engine using WebSockets and optimistic mutations.', 'todo', 'high', 1, '00000000-0000-0000-0000-000000000002', '2026-04-10', '2026-04-28', ARRAY['Offline', 'Database', 'Sync'], 32),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Configure Multi-Region Kubernetes Ingress & TLS', 'Deploy Istio service mesh across us-east and eu-central regions with automatic cert-manager provisioning.', 'done', 'high', 0, '00000000-0000-0000-0000-000000000002', '2026-03-01', '2026-03-25', ARRAY['DevOps', 'Kubernetes', 'Infra'], 40),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Establish Token Palette and WCAG AAA Contrast Ratios', 'Define semantic variables for dark and light surfaces ensuring compliance with accessibility guidelines.', 'in_review', 'medium', 0, '00000000-0000-0000-0000-000000000004', '2026-04-05', '2026-04-22', ARRAY['Design System', 'Accessibility'], 16)
ON CONFLICT (id) DO NOTHING;

-- 9. Task Assignees
INSERT INTO public.task_assignees (task_id, user_id)
VALUES
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (task_id, user_id) DO NOTHING;

-- 10. Subtasks
INSERT INTO public.subtasks (id, task_id, title, completed, order_index)
VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Audit Secure Enclave cryptography specs', true, 0),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Implement iOS LocalAuthentication framework binding', true, 1),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Implement Android BiometricPrompt with fallback PIN', false, 2)
ON CONFLICT (id) DO NOTHING;

-- 11. Notes
INSERT INTO public.notes (id, workspace_id, project_id, author_id, title, content, is_pinned, tags)
VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Key Architecture Decisions for v3 Launch', '## Security & Auth Principles
- Store tokens strictly in Hardware Keystore / Secure Enclave
- All mutations must be idempotently signed
- Zero cleartext tokens written to persistent local storage.', true, ARRAY['Architecture', 'Security'])
ON CONFLICT (id) DO NOTHING;

-- 12. Announcements
INSERT INTO public.announcements (id, workspace_id, author_id, title, content, priority, is_pinned)
VALUES
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '🚀 Production Database & Media Assets Storage Ready!', 'The PostgreSQL database structure, real-time WebSocket publications, client document repositories, and dynamic auth triggers are active and connected.', 'urgent', true)
ON CONFLICT (id) DO NOTHING;
