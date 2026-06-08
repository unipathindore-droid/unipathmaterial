alter type public.app_role add value if not exists 'superadmin';

alter table public.profiles
  add column if not exists approval_status text not null default 'pending',
  add column if not exists invited_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists email_verified_at timestamptz,
  add column if not exists last_login_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_approval_status_chk'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_chk
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  subject_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_approval_status on public.profiles(approval_status);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_subject_user_id on public.audit_logs(subject_user_id);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);

create or replace function public.current_user_is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'superadmin'
      and is_active = true
      and approval_status = 'approved'
  );
$$;

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;

  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
  loop
    execute format('drop policy if exists %I on public.audit_logs', policy_record.policyname);
  end loop;
end $$;

create policy profiles_select_self_or_superadmin
on public.profiles
for select
using (
  id = auth.uid()
  or public.current_user_is_superadmin()
);

create policy profiles_insert_self_or_superadmin
on public.profiles
for insert
with check (
  id = auth.uid()
  or public.current_user_is_superadmin()
);

create policy profiles_update_self_or_superadmin
on public.profiles
for update
using (
  id = auth.uid()
  or public.current_user_is_superadmin()
)
with check (
  id = auth.uid()
  or public.current_user_is_superadmin()
);

create policy audit_logs_select_own_or_superadmin
on public.audit_logs
for select
using (
  actor_user_id = auth.uid()
  or subject_user_id = auth.uid()
  or public.current_user_is_superadmin()
);

create policy audit_logs_insert_own_or_superadmin
on public.audit_logs
for insert
with check (
  actor_user_id = auth.uid()
  or public.current_user_is_superadmin()
);

update public.profiles
set
  approval_status = 'approved',
  approved_at = coalesce(approved_at, timezone('utc', now())),
  email_verified_at = coalesce(email_verified_at, timezone('utc', now()))
where is_active = true;
