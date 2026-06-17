-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_runs ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Saved searches table policies
CREATE POLICY "Users can view their own saved searches" ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches" ON public.saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" ON public.saved_searches
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" ON public.saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- Search runs table policies
CREATE POLICY "Users can view their own search runs" ON public.search_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search runs" ON public.search_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search runs" ON public.search_runs
  FOR DELETE USING (auth.uid() = user_id);