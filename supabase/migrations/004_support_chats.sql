-- Create support chats table
create table public.support_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create support messages table
create table public.support_messages (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid references public.support_chats(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.support_chats enable row level security;
alter table public.support_messages enable row level security;

-- Policies for support_chats

-- 1. Users can insert their own support chat
create policy "Users can insert their own support chat"
  on public.support_chats for insert
  with check (auth.uid() = user_id);

-- 2. Users can view their own support chats
create policy "Users can view their own support chats"
  on public.support_chats for select
  using (auth.uid() = user_id);

-- 3. Super admins can view all support chats
create policy "Super admins can view all support chats"
  on public.support_chats for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- 4. Super admins can update support chats (close them)
create policy "Super admins can update support chats"
  on public.support_chats for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- Policies for support_messages

-- 1. Users can insert messages to their own chat
create policy "Users can insert messages to their own chat"
  on public.support_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.support_chats
      where support_chats.id = chat_id and support_chats.user_id = auth.uid()
    )
  );

-- 2. Super admins can insert messages to any chat
create policy "Super admins can insert messages to any chat"
  on public.support_messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- 3. Users can view messages in their own chat
create policy "Users can view messages in their own chat"
  on public.support_messages for select
  using (
    exists (
      select 1 from public.support_chats
      where support_chats.id = chat_id and support_chats.user_id = auth.uid()
    )
  );

-- 4. Super admins can view all messages
create policy "Super admins can view all messages"
  on public.support_messages for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );

-- Indexes for performance
create index idx_support_chats_user_id on public.support_chats(user_id);
create index idx_support_messages_chat_id on public.support_messages(chat_id);
create index idx_support_messages_created_at on public.support_messages(created_at);
