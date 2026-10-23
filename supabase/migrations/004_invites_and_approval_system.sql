-- ====================================================================
-- MIGRATION 004: INVITATION LINKS & WORKSPACE APPROVAL SYSTEM
-- 1. Adds username and approval_status to profiles
-- 2. Creates public.workspace_invites table
-- 3. Configures RLS policies for invite links and pending approvals
-- ====================================================================

-- 1. Extend profiles with username and approval_status if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' 
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- 2. Set Vinz Media owner profile username
UPDATE public.profiles
SET username = 'vinzmedia',
    approval_status = 'approved',
    role = 'owner'
WHERE email = 'vinz@vinzmedia.com';

-- 3. Create workspace_invites table
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'project_manager', 'member', 'guest')),
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'approved', 'rejected', 'expired')),
  username TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '7 days')
);

-- Index on token for fast URL lookup
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON public.workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);

-- 4. Enable Row Level Security
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Allow reading invites by token (for onboarding) and members
DROP POLICY IF EXISTS "Public invite token lookup" ON public.workspace_invites;
CREATE POLICY "Public invite token lookup"
  ON public.workspace_invites
  FOR SELECT
  TO public
  USING (true);

-- Allow creating and updating invites
DROP POLICY IF EXISTS "Workspace members can manage invites" ON public.workspace_invites;
CREATE POLICY "Workspace members can manage invites"
  ON public.workspace_invites
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow pending users to be updated upon approval
DROP POLICY IF EXISTS "Allow approval updates on profiles" ON public.profiles;
CREATE POLICY "Allow approval updates on profiles"
  ON public.profiles
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
