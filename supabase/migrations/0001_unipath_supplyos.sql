create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.app_role as enum ('admin', 'branch_admin', 'sales', 'material_team', 'dispatch');
create type public.request_status as enum (
  'draft',
  'submitted',
  'partially_approved',
  'approved',
  'rejected',
  'dispatched',
  'delivered'
);
create type public.approval_decision as enum ('pending', 'approved', 'partially_approved', 'rejected');
create type public.dispatch_status as enum ('queued', 'packed', 'dispatched', 'delivered');
create type public.delivery_status as enum ('pending', 'in_transit', 'delivered', 'issue');
create type public.notification_kind as enum ('internal', 'client_email');
create type public.email_event_type as enum ('dispatch_notice', 'expiry_warning');
create type public.reorder_reason as enum ('low_stock', 'expiry_risk');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text not null,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null,
  email citext not null unique,
  role public.app_role not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  account_owner_id uuid references public.profiles(id) on delete set null,
  client_code text not null unique,
  name text not null,
  email citext not null,
  phone text,
  city text not null,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null,
  unit_of_measure text not null,
  requires_expiry_before_dispatch boolean not null default false,
  reorder_level integer not null default 0 check (reorder_level >= 0),
  reorder_quantity integer not null default 0 check (reorder_quantity >= 0),
  expiry_warning_days integer not null default 7 check (expiry_warning_days >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.branch_inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  available_quantity integer not null default 0 check (available_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  reorder_quantity integer not null default 0 check (reorder_quantity >= 0),
  nearest_expiry_date date,
  last_restocked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, material_id)
);

create table public.material_requests (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  request_number text not null unique,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status public.request_status not null default 'draft',
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'high', 'critical')),
  notes text,
  needed_by date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.material_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.material_requests(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete restrict,
  requested_quantity integer not null check (requested_quantity > 0),
  approved_quantity integer check (approved_quantity >= 0),
  approval_reason text,
  decision public.approval_decision not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_id, material_id),
  constraint partial_approval_requires_reason check (
    approved_quantity is null
    or approved_quantity = requested_quantity
    or (approved_quantity < requested_quantity and nullif(trim(approval_reason), '') is not null)
  )
);

create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  request_id uuid not null references public.material_requests(id) on delete restrict,
  dispatch_number text not null unique,
  status public.dispatch_status not null default 'queued',
  courier_name text,
  tracking_number text,
  prepared_by uuid references public.profiles(id) on delete set null,
  dispatched_by uuid references public.profiles(id) on delete set null,
  packed_at timestamptz,
  dispatched_at timestamptz,
  eta_date date,
  client_email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.dispatch_items (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  request_item_id uuid not null references public.material_request_items(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  branch_inventory_id uuid not null references public.branch_inventory(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  batch_number text,
  expiry_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null unique references public.dispatches(id) on delete cascade,
  status public.delivery_status not null default 'pending',
  recipient_name text,
  proof_url text,
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.consumption_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  material_id uuid not null references public.materials(id) on delete restrict,
  dispatch_item_id uuid references public.dispatch_items(id) on delete set null,
  quantity integer not null check (quantity > 0),
  consumed_on date not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  title text not null,
  body text not null,
  kind public.notification_kind not null default 'internal',
  route text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  dispatch_id uuid references public.dispatches(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  event_type public.email_event_type not null,
  recipient_email citext not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.reorder_recommendations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  reason public.reorder_reason not null,
  suggested_quantity integer not null check (suggested_quantity >= 0),
  notes text,
  status text not null default 'open' check (status in ('open', 'ordered', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = any(roles)
      and is_active = true
  )
$$;

create or replace function public.can_access_branch(target_branch uuid)
returns boolean
language sql
stable
as $$
  select case
    when public.has_role(array['admin']::public.app_role[]) then true
    when public.current_branch_id() is null then false
    else public.current_branch_id() = target_branch
  end
$$;

create or replace function public.validate_dispatch_item_expiry()
returns trigger
language plpgsql
as $$
declare
  expiry_required boolean;
begin
  select requires_expiry_before_dispatch into expiry_required
  from public.materials
  where id = new.material_id;

  if expiry_required and new.expiry_date is null then
    raise exception 'Expiry date is required before dispatch for this material';
  end if;

  return new;
end;
$$;

create or replace function public.create_reorder_recommendation()
returns trigger
language plpgsql
as $$
declare
  expiry_limit date;
begin
  select current_date + make_interval(days => greatest(m.expiry_warning_days, 7))::interval
  into expiry_limit
  from public.materials m
  where m.id = new.material_id;

  if new.available_quantity <= new.reorder_level then
    insert into public.reorder_recommendations (branch_id, material_id, reason, suggested_quantity, notes)
    values (
      new.branch_id,
      new.material_id,
      'low_stock',
      greatest(new.reorder_quantity, new.reorder_level),
      'Auto-created because available quantity dropped below reorder level.'
    );
  end if;

  if new.nearest_expiry_date is not null and new.nearest_expiry_date <= (current_date + 7) then
    insert into public.reorder_recommendations (branch_id, material_id, reason, suggested_quantity, notes)
    values (
      new.branch_id,
      new.material_id,
      'expiry_risk',
      greatest(new.reorder_quantity, new.reorder_level),
      'Auto-created because nearest expiry is within seven days.'
    );
  end if;

  return new;
end;
$$;

create or replace function public.queue_dispatch_email()
returns trigger
language plpgsql
as $$
declare
  client_row public.clients%rowtype;
begin
  if new.status = 'dispatched' and old.status is distinct from 'dispatched' then
    select * into client_row from public.clients where id = new.client_id;

    insert into public.email_events (
      client_id,
      branch_id,
      dispatch_id,
      event_type,
      recipient_email,
      payload
    )
    values (
      new.client_id,
      new.branch_id,
      new.id,
      'dispatch_notice',
      client_row.email,
      jsonb_build_object(
        'dispatch_number', new.dispatch_number,
        'tracking_number', new.tracking_number,
        'eta_date', new.eta_date
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.queue_expiry_warning_emails()
returns void
language plpgsql
security definer
as $$
begin
  insert into public.email_events (client_id, branch_id, material_id, event_type, recipient_email, payload)
  select distinct
    c.id,
    c.branch_id,
    bi.material_id,
    'expiry_warning',
    c.email,
    jsonb_build_object(
      'material_name', m.name,
      'nearest_expiry_date', bi.nearest_expiry_date
    )
  from public.branch_inventory bi
  join public.materials m on m.id = bi.material_id
  join public.clients c on c.branch_id = bi.branch_id and c.status = 'active'
  where bi.nearest_expiry_date is not null
    and bi.nearest_expiry_date <= current_date + 7
    and not exists (
      select 1
      from public.email_events ee
      where ee.client_id = c.id
        and ee.material_id = bi.material_id
        and ee.event_type = 'expiry_warning'
        and ee.created_at::date = current_date
    );
end;
$$;

create or replace view public.request_summary as
select
  mr.id,
  mr.branch_id,
  mr.client_id,
  c.name as client_name,
  mr.request_number,
  mr.status,
  mr.created_at as requested_at,
  mr.needed_by,
  count(mri.id) as total_items,
  coalesce(sum(mri.requested_quantity), 0)::integer as total_requested_quantity
from public.material_requests mr
join public.clients c on c.id = mr.client_id
left join public.material_request_items mri on mri.request_id = mr.id
group by mr.id, c.name;

create or replace view public.approval_queue as
select
  mr.id,
  mr.request_number,
  b.name as branch_name,
  c.name as client_name,
  p.full_name as submitted_by,
  count(mri.id) filter (where mri.decision = 'pending')::integer as pending_items,
  case
    when bool_or(mri.decision = 'partially_approved') then 'partially_approved'::public.approval_decision
    when bool_or(mri.decision = 'approved') then 'approved'::public.approval_decision
    when bool_or(mri.decision = 'rejected') then 'rejected'::public.approval_decision
    else 'pending'::public.approval_decision
  end as decision,
  max(mri.approval_reason) filter (where mri.approval_reason is not null) as partial_reason,
  mr.created_at as submitted_at
from public.material_requests mr
join public.branches b on b.id = mr.branch_id
join public.clients c on c.id = mr.client_id
join public.profiles p on p.id = mr.requested_by
left join public.material_request_items mri on mri.request_id = mr.id
group by mr.id, b.name, c.name, p.full_name;

create or replace view public.dispatch_overview as
select
  d.id,
  d.dispatch_number,
  mr.request_number,
  c.name as client_name,
  b.name as branch_name,
  d.status,
  d.courier_name,
  d.tracking_number,
  d.dispatched_at,
  d.eta_date,
  d.created_at
from public.dispatches d
join public.material_requests mr on mr.id = d.request_id
join public.clients c on c.id = d.client_id
join public.branches b on b.id = d.branch_id;

create or replace view public.inventory_overview as
select
  bi.id,
  bi.branch_id,
  bi.material_id,
  m.name as material_name,
  bi.available_quantity,
  bi.reserved_quantity,
  bi.reorder_level,
  bi.nearest_expiry_date
from public.branch_inventory bi
join public.materials m on m.id = bi.material_id;

create trigger set_branches_updated_at before update on public.branches for each row execute procedure public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
create trigger set_materials_updated_at before update on public.materials for each row execute procedure public.set_updated_at();
create trigger set_branch_inventory_updated_at before update on public.branch_inventory for each row execute procedure public.set_updated_at();
create trigger set_requests_updated_at before update on public.material_requests for each row execute procedure public.set_updated_at();
create trigger set_request_items_updated_at before update on public.material_request_items for each row execute procedure public.set_updated_at();
create trigger set_dispatches_updated_at before update on public.dispatches for each row execute procedure public.set_updated_at();
create trigger set_dispatch_items_updated_at before update on public.dispatch_items for each row execute procedure public.set_updated_at();
create trigger set_deliveries_updated_at before update on public.deliveries for each row execute procedure public.set_updated_at();
create trigger set_consumption_updated_at before update on public.consumption_logs for each row execute procedure public.set_updated_at();
create trigger set_reorder_updated_at before update on public.reorder_recommendations for each row execute procedure public.set_updated_at();
create trigger validate_dispatch_expiry before insert or update on public.dispatch_items for each row execute procedure public.validate_dispatch_item_expiry();
create trigger inventory_reorder_signal after insert or update on public.branch_inventory for each row execute procedure public.create_reorder_recommendation();
create trigger dispatch_email_signal after update on public.dispatches for each row execute procedure public.queue_dispatch_email();

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.materials enable row level security;
alter table public.branch_inventory enable row level security;
alter table public.material_requests enable row level security;
alter table public.material_request_items enable row level security;
alter table public.dispatches enable row level security;
alter table public.dispatch_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.consumption_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.email_events enable row level security;
alter table public.reorder_recommendations enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles
for select using (id = auth.uid() or public.has_role(array['admin']::public.app_role[]));

create policy "profiles_update_self_or_admin" on public.profiles
for update using (id = auth.uid() or public.has_role(array['admin']::public.app_role[]));

create policy "branches_select_authenticated" on public.branches
for select using (auth.role() = 'authenticated');

create policy "branches_admin_write" on public.branches
for all using (public.has_role(array['admin']::public.app_role[]))
with check (public.has_role(array['admin']::public.app_role[]));

create policy "clients_branch_access" on public.clients
for select using (public.can_access_branch(branch_id));

create policy "clients_manage" on public.clients
for all using (public.has_role(array['admin', 'branch_admin', 'sales']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'sales']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "materials_read_all" on public.materials
for select using (auth.role() = 'authenticated');

create policy "materials_manage" on public.materials
for all using (public.has_role(array['admin', 'material_team']::public.app_role[]))
with check (public.has_role(array['admin', 'material_team']::public.app_role[]));

create policy "inventory_branch_access" on public.branch_inventory
for select using (public.can_access_branch(branch_id));

create policy "inventory_manage" on public.branch_inventory
for all using (public.has_role(array['admin', 'branch_admin', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "requests_branch_access" on public.material_requests
for select using (public.can_access_branch(branch_id));

create policy "requests_manage" on public.material_requests
for all using (public.has_role(array['admin', 'branch_admin', 'sales', 'material_team', 'dispatch']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'sales']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "request_items_branch_access" on public.material_request_items
for select using (
  exists (
    select 1 from public.material_requests mr
    where mr.id = request_id and public.can_access_branch(mr.branch_id)
  )
);

create policy "request_items_manage" on public.material_request_items
for all using (
  exists (
    select 1 from public.material_requests mr
    where mr.id = request_id
      and public.can_access_branch(mr.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'sales', 'material_team']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.material_requests mr
    where mr.id = request_id
      and public.can_access_branch(mr.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'sales', 'material_team']::public.app_role[])
  )
);

create policy "dispatches_branch_access" on public.dispatches
for select using (public.can_access_branch(branch_id));

create policy "dispatches_manage" on public.dispatches
for all using (public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "dispatch_items_branch_access" on public.dispatch_items
for select using (
  exists (
    select 1 from public.dispatches d where d.id = dispatch_id and public.can_access_branch(d.branch_id)
  )
);

create policy "dispatch_items_manage" on public.dispatch_items
for all using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[])
  )
);

create policy "deliveries_branch_access" on public.deliveries
for select using (
  exists (
    select 1 from public.dispatches d where d.id = dispatch_id and public.can_access_branch(d.branch_id)
  )
);

create policy "deliveries_manage" on public.deliveries
for all using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'dispatch']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'branch_admin', 'dispatch']::public.app_role[])
  )
);

create policy "consumption_branch_access" on public.consumption_logs
for select using (public.can_access_branch(branch_id));

create policy "consumption_manage" on public.consumption_logs
for all using (public.has_role(array['admin', 'branch_admin', 'sales', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'sales', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "notifications_read_own" on public.notifications
for select using (recipient_user_id = auth.uid() or public.has_role(array['admin']::public.app_role[]));

create policy "notifications_update_own" on public.notifications
for update using (recipient_user_id = auth.uid());

create policy "email_events_branch_access" on public.email_events
for select using (public.can_access_branch(branch_id));

create policy "email_events_manage" on public.email_events
for all using (public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'dispatch', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id));

create policy "reorder_branch_access" on public.reorder_recommendations
for select using (public.can_access_branch(branch_id));

create policy "reorder_manage" on public.reorder_recommendations
for all using (public.has_role(array['admin', 'branch_admin', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id))
with check (public.has_role(array['admin', 'branch_admin', 'material_team']::public.app_role[]) and public.can_access_branch(branch_id));
