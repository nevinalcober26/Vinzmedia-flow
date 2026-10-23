-- ====================================================================
-- CREATE DEFAULT OWNER ACCOUNT IN SUPABASE AUTH & PROFILES
-- Email: vinz@vinzmedia.com
-- Password: KurtMarx2020!
-- Role: Owner
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id UUID := 'a0000000-0000-0000-0000-000000000001';
  new_ws_id UUID := 'b0000000-0000-0000-0000-000000000001';
  user_email TEXT := 'vinz@vinzmedia.com';
  user_password TEXT := 'KurtMarx2020!';
  encrypted_pw TEXT;
BEGIN
  -- Generate bcrypt hash with pgcrypto
  encrypted_pw := crypt(user_password, gen_salt('bf', 10));

  -- 1. Insert into auth.users (Supabase Authentication table)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      encrypted_pw,
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Vinz Media","role":"owner"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 2. Insert into auth.identities (Required by Supabase GoTrue Auth for email logins)
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id, user_email)::jsonb,
      'email',
      new_user_id::text,
      now(),
      now(),
      now()
    );
  ELSE
    -- If already exists, update password and confirm email
    SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;
    UPDATE auth.users
    SET encrypted_password = encrypted_pw,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = '{"full_name":"Vinz Media","role":"owner"}'::jsonb,
        updated_at = now()
    WHERE id = new_user_id;
  END IF;

  -- 3. Upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    title,
    department,
    status
  ) VALUES (
    new_user_id,
    user_email,
    'Vinz Media',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'owner',
    'Founder & Workspace Owner',
    'Executive',
    'online'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'owner',
    full_name = 'Vinz Media',
    email = user_email;

  -- 4. Create primary organization workspace if none exists
  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE owner_id = new_user_id) THEN
    INSERT INTO public.workspaces (
      id,
      name,
      slug,
      description,
      owner_id,
      plan
    ) VALUES (
      new_ws_id,
      'VinzMedia Workspace',
      'vinzmedia-hq',
      'Primary organization workspace for Vinz Media initiatives',
      new_user_id,
      'enterprise'
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO new_ws_id FROM public.workspaces WHERE owner_id = new_user_id LIMIT 1;
  END IF;

  -- 5. Ensure workspace membership with Owner role
  INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role
  ) VALUES (
    new_ws_id,
    new_user_id,
    'owner'
  )
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET
    role = 'owner';

END $$;
