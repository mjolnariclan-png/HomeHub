-- Run this in Supabase SQL Editor
-- Purpose:
-- 1) Allow authenticated users to upload/update/delete only their own avatar/background files.
-- 2) Allow family members to read each other's avatar/background files.

-- 1) Create storage bucket (id and name should match)
insert into storage.buckets (id, name, public)
values ('homehub-media', 'homehub-media', false)
on conflict (id) do nothing;

-- Drop existing policies so this script can be re-run safely
drop policy if exists "media_select_own" on storage.objects;
drop policy if exists "media_select_family" on storage.objects;
drop policy if exists "media_insert_own" on storage.objects;
drop policy if exists "media_update_own" on storage.objects;
drop policy if exists "media_delete_own" on storage.objects;

-- 2) Policy: family members can read each other's avatar/background files
create policy "media_select_family"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'homehub-media'
  and (
    split_part(name, '/', 1) in ('avatars', 'backgrounds')
    and exists (
      select 1
      from public.profiles me
      join public.profiles owner on owner.id::text = split_part(split_part(storage.objects.name, '/', 2), '.', 1)
      where me.id = auth.uid()
        and me.family_id is not null
        and owner.family_id = me.family_id
    )
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
