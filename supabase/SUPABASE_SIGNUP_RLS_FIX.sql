-- Run this in the Supabase SQL Editor.
-- This restores the signup RPCs without changing existing families or profiles.

create extension if not exists pgcrypto;

create or replace function public.signup_create_family(
  p_user_id uuid,
  p_email text,
  p_family_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_family_code text;
  v_display_name text;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'You can only create a family for your own account';
  end if;

  select family_id into v_family_id
  from public.profiles
  where id = p_user_id;

  if v_family_id is not null then
    return;
  end if;

  v_family_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_display_name := coalesce(nullif(split_part(p_email, '@', 1), ''), 'Family Admin');

  insert into public.families (name, family_code)
  values (coalesce(nullif(trim(p_family_name), ''), 'My Family'), v_family_code)
  returning id into v_family_id;

  insert into public.profiles (id, email, display_name, username, family_id, role)
  values (p_user_id, p_email, v_display_name, v_display_name, v_family_id, 'admin')
  on conflict (id) do update
  set family_id = excluded.family_id,
      role = 'admin';
end;
$$;

create or replace function public.signup_join_family(
  p_user_id uuid,
  p_email text,
  p_family_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_display_name text;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'You can only join a family for your own account';
  end if;

  select id into v_family_id
  from public.families
  where family_code = upper(trim(p_family_code));

  if v_family_id is null then
    raise exception 'Family code not found';
  end if;

  v_display_name := coalesce(nullif(split_part(p_email, '@', 1), ''), 'Family Member');

  insert into public.profiles (id, email, display_name, username, family_id, role)
  values (p_user_id, p_email, v_display_name, v_display_name, v_family_id, 'member')
  on conflict (id) do update
  set family_id = excluded.family_id;
end;
$$;

grant execute on function public.signup_create_family(uuid, text, text) to authenticated;
grant execute on function public.signup_join_family(uuid, text, text) to authenticated;

-- Repair the authenticated user whose first signup failed.
-- After running the functions above, sign up again with the Create option.
-- Do not run a direct INSERT for that user unless you know which family it belongs to.
