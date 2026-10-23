-- ====================================================================
-- VINZFLOW SUPABASE STORAGE BUCKETS & POLICIES SETUP
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yylfprczgqvakkkdctal/sql
-- ====================================================================

-- 1. Ensure projects table has all_members column for visibility scoping
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS all_members BOOLEAN DEFAULT true;

-- 2. Create Storage Buckets (avatars, project-logos, attachments, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'avatars', 
    'avatars', 
    true, 
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'project-logos', 
    'project-logos', 
    true, 
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  ),
  (
    'attachments', 
    'attachments', 
    true, 
    52428800, -- 50MB
    NULL -- All attachment formats
  ),
  (
    'documents', 
    'documents', 
    true, 
    52428800, -- 50MB
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ]
  )
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage Object RLS Policies (storage.objects)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean existing policies on these buckets
DROP POLICY IF EXISTS "Public Read Access for VinzFlow Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload for VinzFlow Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Update for VinzFlow Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Delete for VinzFlow Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Dev Public Access for VinzFlow Buckets" ON storage.objects;

-- Allow public read access on all VinzFlow assets so they render instantly
CREATE POLICY "Public Read Access for VinzFlow Buckets" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  );

-- Full access for authenticated workspace members
CREATE POLICY "Authenticated User Upload for VinzFlow Buckets" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  );

CREATE POLICY "Authenticated User Update for VinzFlow Buckets" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  );

CREATE POLICY "Authenticated User Delete for VinzFlow Buckets" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  );

-- Permissive policy for active client application uploads
CREATE POLICY "Dev Public Access for VinzFlow Buckets" ON storage.objects
  FOR ALL USING (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  ) WITH CHECK (
    bucket_id IN ('avatars', 'project-logos', 'attachments', 'documents')
  );
