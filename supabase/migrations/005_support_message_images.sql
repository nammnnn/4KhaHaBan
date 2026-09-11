-- 1. Add image_url to support_messages
alter table public.support_messages
add column image_url text;

-- 2. Create Storage Bucket for chat images
insert into storage.buckets (id, name, public) 
values ('chat_images', 'chat_images', true)
on conflict (id) do nothing;

-- 3. Storage Policies for chat_images
create policy "Public Access to chat images"
  on storage.objects for select
  using ( bucket_id = 'chat_images' );

create policy "Users can upload chat images"
  on storage.objects for insert
  with check ( bucket_id = 'chat_images' and auth.role() = 'authenticated' );
