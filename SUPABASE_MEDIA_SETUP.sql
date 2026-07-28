-- Run this once in Supabase SQL Editor
-- Purpose: allow authenticated users to upload/read/delete their own media files in bucket homehub-media

-- 1) Create storage bucket (id and name should match)
insert into storage.buckets (id, name, public)
values ('homehub-media', 'homehub-media', false)
on conflict (id) do nothing;

-- 2) Policy: users can read their own avatar/background files via signed URLs
create policy "media_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'homehub-media'
  and (
    (split_part(name, '/', 1) = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
    or
    (split_part(name, '/', 1) = 'backgrounds' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  )
);

-- 3) Policy: users can upload their own files only
create policy "media_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homehub-media'
  and (
    (split_part(name, '/', 1) = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
    or
    (split_part(name, '/', 1) = 'backgrounds' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  )
);

-- 4) Policy: users can update their own files only
create policy "media_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'homehub-media'
  and (
    (split_part(name, '/', 1) = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
    or
    (split_part(name, '/', 1) = 'backgrounds' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  )
)
with check (
  bucket_id = 'homehub-media'
  and (
    (split_part(name, '/', 1) = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
    or
    (split_part(name, '/', 1) = 'backgrounds' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  )
);

-- 5) Policy: users can delete their own files only
create policy "media_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'homehub-media'
  and (
    (split_part(name, '/', 1) = 'avatars' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
    or
    (split_part(name, '/', 1) = 'backgrounds' and split_part(split_part(name, '/', 2), '.', 1) = auth.uid()::text)
  )
);
