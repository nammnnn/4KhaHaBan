-- Create donations table
create table public.donations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10, 2) not null check (amount > 0),
  billing_cycle text not null check (billing_cycle in ('once', 'monthly')),
  status text not null default 'completed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.donations enable row level security;

-- Policies

-- 1. Users can insert their own donations
create policy "Users can insert their own donations"
  on public.donations for insert
  with check (auth.uid() = user_id);

-- 2. Users can view their own donations
create policy "Users can view their own donations"
  on public.donations for select
  using (auth.uid() = user_id);

-- 3. Super admins can view all donations
create policy "Super admins can view all donations"
  on public.donations for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- Indexes for performance
create index idx_donations_user_id on public.donations(user_id);
create index idx_donations_created_at on public.donations(created_at);
