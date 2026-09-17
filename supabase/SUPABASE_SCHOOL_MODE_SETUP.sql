-- Run in the Supabase SQL Editor after SUPABASE_SCHOOL_SETUP.sql.
-- Adds per-student school-mode schedules without changing existing records.

create table if not exists public.school_mode_schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  time_zone text not null default 'America/Chicago',
  start_time time not null,
  end_time time not null,
  active_days integer[] not null default array[1,2,3,4,5],
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_mode_days_valid check (active_days <@ array[0,1,2,3,4,5,6])
);

alter table public.school_mode_schedules enable row level security;
drop policy if exists "school_mode_read_linked_student" on public.school_mode_schedules;
drop policy if exists "school_mode_manage_adults" on public.school_mode_schedules;
create policy "school_mode_read_linked_student" on public.school_mode_schedules for select to authenticated using (
  student_id in (select id from public.students where profile_id = auth.uid())
  or exists (select 1 from public.students s join public.profiles p on p.family_id = s.family_id where s.id = student_id and p.id = auth.uid() and p.role in ('admin', 'adult'))
);
create policy "school_mode_manage_adults" on public.school_mode_schedules for all to authenticated using (
  exists (select 1 from public.students s join public.profiles p on p.family_id = s.family_id where s.id = student_id and p.id = auth.uid() and p.role in ('admin', 'adult'))
) with check (
  exists (select 1 from public.students s join public.profiles p on p.family_id = s.family_id where s.id = student_id and p.id = auth.uid() and p.role in ('admin', 'adult'))
);

notify pgrst, 'reload schema';
