insert into public.profiles (
  id,
  full_name,
  email,
  role,
  branch_id,
  is_active,
  approval_status,
  approved_at,
  email_verified_at
)
values (
  '367eaf0a-a99b-4154-b5eb-798cfd1d4e89',
  'UNIPATH SPECIALTY LABORATORY',
  'unipath.indore@gmail.com',
  'superadmin',
  null,
  true,
  'approved',
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  branch_id = excluded.branch_id,
  is_active = excluded.is_active,
  approval_status = excluded.approval_status,
  approved_at = excluded.approved_at,
  email_verified_at = excluded.email_verified_at;
