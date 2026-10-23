-- ====================================================================
-- VINZFLOW PROJECT CLIENT ASSOCIATIONS & REALTIME MIGRATION
-- File: supabase/migrations/008_project_clients_and_realtime_conversion.sql
-- ====================================================================

-- 1. Ensure projects table has direct client_id foreign key
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);

-- 2. Ensure client_projects relation table exists for many-to-many associations
CREATE TABLE IF NOT EXISTS public.client_projects (
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (client_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_client_projects_client ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_project ON public.client_projects(project_id);

-- 3. Row Level Security for client_projects
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage client_projects" ON public.client_projects;
CREATE POLICY "Authenticated users can manage client_projects"
  ON public.client_projects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Realtime Publication for clients and client_projects
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.client_projects;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
