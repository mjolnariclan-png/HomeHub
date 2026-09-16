-- Run this in the Supabase SQL Editor after the existing setup scripts.
-- Creates admin-controlled, cross-family sharing without changing source records.

create table if not exists public.family_shares (
  id uuid primary key default gen_random_uuid(),
  source_family_id uuid not null references public.families(id) on delete cascade,
  target_family_id uuid not null references public.families(id) on delete cascade,
  resource_type text not null check (resource_type in ('recipe', 'chore', 'calendar_event')),
  resource_id uuid not null,
  share_mode text not null check (share_mode in ('live', 'snapshot')),
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint family_shares_different_families check (source_family_id <> target_family_id),
  constraint family_shares_unique_resource unique (source_family_id, target_family_id, resource_type, resource_id, share_mode)
);

create index if not exists family_shares_target_active_idx
  on public.family_shares (target_family_id, resource_type)
  where revoked_at is null;

create table if not exists public.family_share_connections (
  id uuid primary key default gen_random_uuid(),
  requesting_family_id uuid not null references public.families(id) on delete cascade,
  receiving_family_id uuid not null references public.families(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint family_share_connections_different_families check (requesting_family_id <> receiving_family_id),
  constraint family_share_connections_unique_pair unique (requesting_family_id, receiving_family_id)
);

alter table public.family_share_connections enable row level security;

alter table public.family_shares enable row level security;

create or replace function public.share_family_content(
  p_resource_type text,
  p_resource_id uuid,
  p_target_family_code text,
  p_share_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_family_id uuid;
  v_target_family_id uuid;
  v_payload jsonb;
begin
  select family_id into v_source_family_id
  from public.profiles
  where id = auth.uid() and role = 'admin';

  if v_source_family_id is null then
    raise exception 'Only family admins can share content';
  end if;

  select id into v_target_family_id
  from public.families
  where family_code = upper(trim(p_target_family_code));

  if v_target_family_id is null then
    raise exception 'Family code not found';
  end if;

  if v_target_family_id = v_source_family_id then
    raise exception 'Choose a different family';
  end if;

  if not exists (
    select 1 from public.family_share_connections c
    where c.status = 'accepted'
      and ((c.requesting_family_id = v_source_family_id and c.receiving_family_id = v_target_family_id)
        or (c.requesting_family_id = v_target_family_id and c.receiving_family_id = v_source_family_id))
  ) then
    raise exception 'This family has not accepted your sharing connection';
  end if;

  if p_resource_type = 'recipe' then
    select to_jsonb(recipes.*) into v_payload
    from public.recipes
    where id = p_resource_id and family_id = v_source_family_id;
  elsif p_resource_type = 'chore' then
    select to_jsonb(chores.*) - 'assigned_to' - 'created_by' into v_payload
    from public.chores
    where id = p_resource_id and family_id = v_source_family_id;
  elsif p_resource_type = 'calendar_event' then
    select to_jsonb(calendar_events.*) - 'assigned_to' - 'created_by' into v_payload
    from public.calendar_events
    where id = p_resource_id and family_id = v_source_family_id;
  else
    raise exception 'Unsupported content type';
  end if;

  if v_payload is null then
    raise exception 'Content not found in your family';
  end if;

  insert into public.family_shares (
    source_family_id, target_family_id, resource_type, resource_id, share_mode, snapshot, created_by, revoked_at
  ) values (
    v_source_family_id, v_target_family_id, p_resource_type, p_resource_id, p_share_mode, v_payload, auth.uid(), null
  )
  on conflict (source_family_id, target_family_id, resource_type, resource_id, share_mode)
  do update set snapshot = excluded.snapshot, created_by = excluded.created_by, created_at = now(), revoked_at = null;
end;
$$;

create or replace function public.request_family_share_connection(p_target_family_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_family_id uuid;
  v_target_family_id uuid;
begin
  select family_id into v_source_family_id from public.profiles where id = auth.uid() and role = 'admin';
  if v_source_family_id is null then raise exception 'Only family admins can connect families'; end if;

  select id into v_target_family_id from public.families where family_code = upper(trim(p_target_family_code));
  if v_target_family_id is null then raise exception 'Family code not found'; end if;
  if v_target_family_id = v_source_family_id then raise exception 'Choose a different family'; end if;

  if exists (
    select 1 from public.family_share_connections
    where (requesting_family_id = v_source_family_id and receiving_family_id = v_target_family_id)
       or (requesting_family_id = v_target_family_id and receiving_family_id = v_source_family_id)
  ) then raise exception 'A sharing connection already exists or is pending'; end if;

  insert into public.family_share_connections (requesting_family_id, receiving_family_id, requested_by)
  values (v_source_family_id, v_target_family_id, auth.uid());
end;
$$;

create or replace function public.accept_family_share_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.family_share_connections c
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  from public.profiles p
  where c.id = p_connection_id and c.receiving_family_id = p.family_id
    and p.id = auth.uid() and p.role = 'admin' and c.status = 'pending';
  if not found then raise exception 'Connection request not found or not permitted'; end if;
end;
$$;

create or replace function public.get_family_share_connections()
returns table (connection_id uuid, family_name text, family_code text, status text, direction text)
language sql
security definer
set search_path = public
as $$
  select c.id, f.name, f.family_code, c.status,
    case when c.requesting_family_id = p.family_id then 'outgoing' else 'incoming' end
  from public.family_share_connections c
  join public.profiles p on p.id = auth.uid() and p.role = 'admin'
  join public.families f on f.id = case when c.requesting_family_id = p.family_id then c.receiving_family_id else c.requesting_family_id end
  where c.requesting_family_id = p.family_id or c.receiving_family_id = p.family_id
  order by c.status, f.name;
$$;

create or replace function public.remove_family_share_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.family_share_connections c
  using public.profiles p
  where c.id = p_connection_id and p.id = auth.uid() and p.role = 'admin'
    and (c.requesting_family_id = p.family_id or c.receiving_family_id = p.family_id);
  if not found then raise exception 'Connection not found or not permitted'; end if;
end;
$$;

create or replace function public.get_shared_family_content(p_resource_type text)
returns table (
  share_id uuid,
  source_family_name text,
  resource_type text,
  share_mode text,
  payload jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from public.profiles where id = auth.uid();
  if v_family_id is null then return; end if;

  return query
  select
    fs.id,
    f.name,
    fs.resource_type,
    fs.share_mode,
    case
      when fs.share_mode = 'snapshot' then fs.snapshot
      when fs.resource_type = 'recipe' then (select to_jsonb(r.*) from public.recipes r where r.id = fs.resource_id and r.family_id = fs.source_family_id)
      when fs.resource_type = 'chore' then (select to_jsonb(c.*) - 'assigned_to' - 'created_by' from public.chores c where c.id = fs.resource_id and c.family_id = fs.source_family_id)
      when fs.resource_type = 'calendar_event' then (select to_jsonb(e.*) - 'assigned_to' - 'created_by' from public.calendar_events e where e.id = fs.resource_id and e.family_id = fs.source_family_id)
    end
  from public.family_shares fs
  join public.families f on f.id = fs.source_family_id
  where fs.target_family_id = v_family_id
    and fs.resource_type = p_resource_type
    and fs.revoked_at is null;
end;
$$;

create or replace function public.get_outgoing_family_shares()
returns table (
  share_id uuid,
  target_family_name text,
  target_family_code text,
  resource_type text,
  share_mode text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select fs.id, f.name, f.family_code, fs.resource_type, fs.share_mode, fs.created_at
  from public.family_shares fs
  join public.families f on f.id = fs.target_family_id
  join public.profiles p on p.family_id = fs.source_family_id
  where p.id = auth.uid() and p.role = 'admin' and fs.revoked_at is null
  order by fs.created_at desc;
$$;

create or replace function public.revoke_family_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.family_shares fs
  set revoked_at = now()
  from public.profiles p
  where fs.id = p_share_id
    and fs.source_family_id = p.family_id
    and p.id = auth.uid()
    and p.role = 'admin';

  if not found then
    raise exception 'Share not found or not permitted';
  end if;
end;
$$;

revoke all on public.family_shares from anon, authenticated;
revoke all on public.family_share_connections from anon, authenticated;
grant execute on function public.share_family_content(text, uuid, text, text) to authenticated;
grant execute on function public.get_shared_family_content(text) to authenticated;
grant execute on function public.get_outgoing_family_shares() to authenticated;
grant execute on function public.revoke_family_share(uuid) to authenticated;
grant execute on function public.request_family_share_connection(text) to authenticated;
grant execute on function public.accept_family_share_connection(uuid) to authenticated;
grant execute on function public.get_family_share_connections() to authenticated;
grant execute on function public.remove_family_share_connection(uuid) to authenticated;

notify pgrst, 'reload schema';
