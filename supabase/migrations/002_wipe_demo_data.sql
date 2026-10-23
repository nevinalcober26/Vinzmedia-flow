-- ====================================================================
-- SCRIPT: WIPE ALL DEMO/MOCK DATA & PREPARE CLEAN PRODUCTION DATABASE
-- Run this in your Supabase SQL Editor to clean out all demo items
-- ====================================================================

-- 1. Wipe dependent operational data
TRUNCATE TABLE public.activity_logs CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.subtasks CASCADE;
TRUNCATE TABLE public.task_assignees CASCADE;
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.files CASCADE;
TRUNCATE TABLE public.client_projects CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.milestones CASCADE;
TRUNCATE TABLE public.notes CASCADE;
TRUNCATE TABLE public.announcements CASCADE;
TRUNCATE TABLE public.project_members CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.workspace_members CASCADE;
TRUNCATE TABLE public.workspaces CASCADE;

-- 2. Remove any mock persona profiles
DELETE FROM public.profiles WHERE id::text LIKE '00000000-%';
