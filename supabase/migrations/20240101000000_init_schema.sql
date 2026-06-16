-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  query text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create search_runs table
CREATE TABLE IF NOT EXISTS public.search_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_search_id uuid REFERENCES public.saved_searches(id) ON DELETE SET NULL,
  query text,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created ON public.saved_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_runs_user_id ON public.search_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_runs_user_created ON public.search_runs(user_id, created_at DESC);