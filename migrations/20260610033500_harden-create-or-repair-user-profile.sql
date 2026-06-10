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
    update public.profiles
       set full_name = p_full_name,
           mobile_number = nullif(p_mobile_number, ''),
           role = p_role,
           branch_id = p_branch_id,
           managed_branch_ids = coalesce(p_managed_branch_ids, '{}'::uuid[]),
           permissions = coalesce(p_permissions, '{}'::jsonb),
           is_active = coalesce(p_is_active, true),
           approval_status = 'approved',
           invited_by = coalesce(v_existing_profile.invited_by, p_invited_by),
           created_by = coalesce(v_existing_profile.created_by, p_invited_by),
           approved_by = coalesce(v_existing_profile.approved_by, p_invited_by),
           approved_at = coalesce(v_existing_profile.approved_at, timezone('utc', now())),
           email_verified_at = coalesce(v_existing_profile.email_verified_at, timezone('utc', now()))
     where id = v_existing_profile.id;

    update auth.users
       set email_verified = true,
           updated_at = timezone('utc', now())
     where id = v_user.id;

    profile_id := v_existing_profile.id;
    repaired := true;
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
    created_by,
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
    'approved',
    p_invited_by,
    p_invited_by,
    p_invited_by,
    timezone('utc', now()),
    timezone('utc', now())
  );

  update auth.users
     set email_verified = true,
         updated_at = timezone('utc', now())
   where id = v_user.id;

  profile_id := v_user.id;
  repaired := true;
  return next;
end;
$$;
