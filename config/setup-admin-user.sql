-- ============================================
-- COMPLETE SUPABASE SETUP SCRIPT
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. ENABLE UUID EXTENSION (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. AUTO CREATE USER TRIGGER
-- This trigger automatically creates a record in the "users" table
-- when a new user signs up via Supabase Auth
-- ============================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 3. CREATE ADMIN USER MANUALLY
-- This creates a user directly in auth.users and public.users
-- Email: admin@dev.id
-- Password: admin091!@#
-- ============================================

-- First, check if user already exists
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@dev.id';
    
    IF admin_user_id IS NULL THEN
        -- Create user in auth.users with password hash
        -- Note: We need to generate the password hash properly
        admin_user_id := uuid_generate_v4();
        
        -- Insert into auth.users (requires admin privileges)
        -- This might fail if you don't have admin access
        RAISE NOTICE 'Creating admin user...';
        
        -- For Supabase, we can only create users via the UI or API
        -- But we can create the public.users record now
        
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (admin_user_id, 'admin@dev.id', 'Administrator', 'admin');
        
        RAISE NOTICE 'Public users record created. Please create the auth user through Supabase Dashboard > Authentication > Users > Add User';
    ELSE
        -- User exists, make sure public.users record exists
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (admin_user_id, 'admin@dev.id', 'Administrator', 'admin')
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
        
        RAISE NOTICE 'Admin user records synced';
    END IF;
END $$;

-- ============================================
-- 4. ALTERNATIVE: CREATE ADMIN USER VIA AUTH.UI
-- Run this to create the admin user (requires Postgres admin role)
-- ============================================

-- Method 1: Using auth.users directly (might require service_role key)
-- INSERT INTO auth.users (
--     instance_id,
--     id,
--     aud,
--     role,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     raw_user_meta_data,
--     created_at,
--     updated_at
-- ) VALUES (
--     (SELECT id FROM auth.instances LIMIT 1),
--     uuid_generate_v4(),
--     'authenticated',
--     'user',
--     'admin@dev.id',
--     -- You'll need to generate the bcrypt hash
--     crypt('admin091!@#', gen_salt('bf')),
--     NOW(),
--     '{"full_name": "Administrator"}'::jsonb,
--     NOW(),
--     NOW()
-- );

-- ============================================
-- 5. CREATE PUBLIC.USERS RECORD FOR ADMIN
-- Run this AFTER creating the auth user
-- ============================================

-- First create the auth user through Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Email: admin@dev.id
-- 4. Password: admin091!@#
-- 5. Click "Create User"

-- Then run this SQL to create the public.users record:
DO $$
DECLARE
    auth_id UUID;
BEGIN
    SELECT id INTO auth_id FROM auth.users WHERE email = 'admin@dev.id';
    
    IF auth_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, full_name, role)
        VALUES (auth_id, 'admin@dev.id', 'Administrator', 'admin')
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;
        
        RAISE NOTICE 'Admin user created successfully!';
    ELSE
        RAISE NOTICE 'Auth user not found. Please create auth user first through Supabase Dashboard.';
    END IF;
END $$;

-- ============================================
-- 6. VERIFICATION
-- Run this to check if everything is set up correctly
-- ============================================

-- Check users in auth.users
SELECT email, id, created_at FROM auth.users WHERE email = 'admin@dev.id';

-- Check users in public.users
SELECT id, email, full_name, role FROM public.users WHERE email = 'admin@dev.id';

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
