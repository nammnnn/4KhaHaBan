-- 1. Add last_seen to profiles
alter table public.profiles
add column last_seen timestamptz;

-- 2. Ensure users can update their own last_seen (assuming UPDATE policy already exists for profiles)
-- If not, you might need a policy like:
-- create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
