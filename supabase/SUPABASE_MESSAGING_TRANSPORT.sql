-- Run in the Supabase SQL Editor after SUPABASE_SIGNUP_RLS_FIX.sql.
-- Privacy model: this stores device public keys and minimal device metadata only.
-- Do not add plaintext message bodies or conversation history to Supabase.

create table if not exists public.message_devices (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  public_key_jwk jsonb not null,
  key_algorithm text not null default 'ECDH-P-256',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (profile_id, device_id)
);

create index if not exists message_devices_profile_active_idx
  on public.message_devices(profile_id)
  where revoked_at is null;

alter table public.message_devices enable row level security;

drop policy if exists "message_devices_manage_own" on public.message_devices;
drop policy if exists "message_devices_read_family_public_keys" on public.message_devices;

create policy "message_devices_manage_own"
on public.message_devices
for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "message_devices_read_family_public_keys"
on public.message_devices
for select
to authenticated
using (
  revoked_at is null
  and exists (
    select 1
    from public.profiles me
    join public.profiles owner on owner.id = message_devices.profile_id
    where me.id = auth.uid()
      and me.family_id = owner.family_id
  )
);

-- Supabase Realtime Broadcast is the transport. It must carry ciphertext only.
-- Recommended private channel names use the family UUID, for example:
-- private:family:<family-id>:messages
-- Configure Realtime Authorization for private channels in Supabase Dashboard.
-- This migration intentionally creates no messages table and no message-body column.

notify pgrst, 'reload schema';
