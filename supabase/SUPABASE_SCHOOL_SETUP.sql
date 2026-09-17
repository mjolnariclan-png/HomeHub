-- Run in the Supabase SQL Editor after the existing setup scripts.
-- Adds family-scoped school records without modifying existing tables or data.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  student_name text not null,
  school_name text,
  grade_level text,
  school_year text,
  teacher_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (student_id, name)
);

create table if not exists public.school_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.school_subjects(id) on delete set null,
  entry_type text not null,
  title text not null,
  score numeric,
  max_score numeric,
  letter_grade text,
  graded_on date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint school_grades_score_range check (score is null or score >= 0),
  constraint school_grades_max_score_range check (max_score is null or max_score > 0),
  constraint school_grades_score_not_above_max check (score is null or max_score is null or score <= max_score)
);

create index if not exists students_family_idx on public.students(family_id);
create index if not exists school_grades_student_date_idx on public.school_grades(student_id, graded_on desc);

alter table public.students enable row level security;
alter table public.school_subjects enable row level security;
alter table public.school_grades enable row level security;

drop policy if exists "students_read_family" on public.students;
drop policy if exists "students_manage_adults" on public.students;
drop policy if exists "subjects_read_family" on public.school_subjects;
drop policy if exists "subjects_manage_adults" on public.school_subjects;
drop policy if exists "grades_read_family" on public.school_grades;
drop policy if exists "grades_manage_adults" on public.school_grades;

create policy "students_read_family" on public.students for select to authenticated using (
  family_id in (select family_id from public.profiles where id = auth.uid())
  and (
    profile_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult'))
  )
);
create policy "students_manage_adults" on public.students for all to authenticated using (
  family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult'))
) with check (
  family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult'))
);
create policy "subjects_read_family" on public.school_subjects for select to authenticated using (
  student_id in (
    select id from public.students
    where family_id in (select family_id from public.profiles where id = auth.uid())
      and (profile_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
  )
);
create policy "subjects_manage_adults" on public.school_subjects for all to authenticated using (
  student_id in (select id from public.students where family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
) with check (
  student_id in (select id from public.students where family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
);
create policy "grades_read_family" on public.school_grades for select to authenticated using (
  student_id in (
    select id from public.students
    where family_id in (select family_id from public.profiles where id = auth.uid())
      and (profile_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
  )
);
create policy "grades_manage_adults" on public.school_grades for all to authenticated using (
  student_id in (select id from public.students where family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
) with check (
  student_id in (select id from public.students where family_id in (select family_id from public.profiles where id = auth.uid() and role in ('admin', 'parent', 'adult')))
);

notify pgrst, 'reload schema';
