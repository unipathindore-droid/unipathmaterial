alter table public.profiles
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

update public.profiles
   set created_by = coalesce(created_by, invited_by),
       approval_status = 'approved',
       approved_at = coalesce(approved_at, timezone('utc', now())),
       email_verified_at = coalesce(email_verified_at, timezone('utc', now()))
 where approval_status is distinct from 'approved'
    or email_verified_at is null;

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

create or replace function public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required.';
  end if;

  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  update auth.users
     set password = crypt(p_new_password, gen_salt('bf')),
         email_verified = true,
         updated_at = timezone('utc', now())
   where id = p_user_id;

  if not found then
    raise exception 'Authentication user not found.';
  end if;
end;
$$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_user_id is null then
    raise exception 'User id is required.';
  end if;

  delete from auth.users
   where id = p_user_id;

  if not found then
    delete from public.profiles
     where id = p_user_id;
  end if;

  if not found then
    raise exception 'User not found.';
  end if;
end;
$$;
