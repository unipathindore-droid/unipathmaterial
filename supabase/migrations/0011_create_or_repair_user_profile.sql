create or replace function public.create_or_repair_user_profile(
  p_email text,
  p_full_name text,
  p_mobile_number text,
  p_role public.app_role,
  p_branch_id uuid,
  p_managed_branch_ids uuid[],
  p_permissions jsonb,
  p_is_active boolean,
  p_invited_by uuid
)
returns table (profile_id uuid, repaired boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users%rowtype;
  v_existing_profile public.profiles%rowtype;
begin
  select *
    into v_user
    from auth.users
   where lower(email) = lower(p_email)
   order by created_at desc
   limit 1;

  if not found then
    raise exception 'No authentication user exists for this email.';
  end if;

  select *
    into v_existing_profile
    from public.profiles
   where id = v_user.id
      or lower(email::text) = lower(p_email)
   limit 1;

  if found then
    profile_id := v_existing_profile.id;
    repaired := false;
    return next;
    return;
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    mobile_number,
    role,
    branch_id,
    managed_branch_ids,
    permissions,
    is_active,
    approval_status,
    invited_by,
    approved_by,
    approved_at,
    email_verified_at
  )
  values (
    v_user.id,
    p_full_name,
    lower(p_email),
    nullif(p_mobile_number, ''),
    p_role,
    p_branch_id,
    coalesce(p_managed_branch_ids, '{}'::uuid[]),
    coalesce(p_permissions, '{}'::jsonb),
    coalesce(p_is_active, true),
    'pending',
    p_invited_by,
    null,
    null,
    case when v_user.email_verified then timezone('utc', now()) else null end
  );

  profile_id := v_user.id;
  repaired := true;
  return next;
end;
$$;
