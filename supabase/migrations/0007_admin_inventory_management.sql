alter table public.branches
  add column if not exists address text,
  add column if not exists pincode text,
  add column if not exists contact_person text,
  add column if not exists contact_number text,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists mobile_number text,
  add column if not exists managed_branch_ids uuid[] not null default '{}'::uuid[],
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.materials
  add column if not exists material_code text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

update public.materials
set material_code = coalesce(material_code, sku)
where material_code is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'materials_material_code_key'
  ) then
    alter table public.materials
      add constraint materials_material_code_key unique (material_code);
  end if;
end $$;

alter table public.branch_inventory
  add column if not exists opening_stock integer not null default 0 check (opening_stock >= 0),
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive')),
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'dispatch_transport_type') then
    create type public.dispatch_transport_type as enum ('person', 'bus', 'courier');
  end if;
end $$;

alter table public.dispatches
  add column if not exists dispatch_date date not null default current_date,
  add column if not exists dispatch_from_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists dispatch_to_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists destination_name text,
  add column if not exists dispatch_type public.dispatch_transport_type,
  add column if not exists person_name text,
  add column if not exists bus_name text,
  add column if not exists bus_number text,
  add column if not exists courier_company_name text,
  add column if not exists lr_number text,
  add column if not exists contact_number text,
  add column if not exists remarks text,
  add column if not exists received_confirmation boolean not null default false,
  add column if not exists received_by text,
  add column if not exists received_date date;

create table if not exists public.monthly_stock_updates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  month date not null,
  opening_stock integer not null default 0 check (opening_stock >= 0),
  received_stock integer not null default 0 check (received_stock >= 0),
  used_stock integer not null default 0 check (used_stock >= 0),
  damaged_stock integer not null default 0 check (damaged_stock >= 0),
  closing_stock integer not null default 0 check (closing_stock >= 0),
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monthly_stock_updates_month_start_chk
    check (month = date_trunc('month', month)::date),
  unique (branch_id, material_id, month)
);

create table if not exists public.excel_activity_logs (
  id uuid primary key default gen_random_uuid(),
  module_name text not null,
  operation text not null check (operation in ('upload', 'export')),
  file_name text,
  branch_id uuid references public.branches(id) on delete set null,
  row_count integer not null default 0 check (row_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deleted_material_logs (
  id uuid primary key default gen_random_uuid(),
  material_id uuid,
  material_snapshot jsonb not null,
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz not null default timezone('utc', now())
);

alter table public.audit_logs
  add column if not exists module_name text,
  add column if not exists record_id text,
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists user_role text,
  add column if not exists ip_address text,
  add column if not exists device_info text;

create index if not exists idx_branches_deleted_at on public.branches(deleted_at);
create index if not exists idx_profiles_managed_branch_ids on public.profiles using gin(managed_branch_ids);
create index if not exists idx_profiles_permissions on public.profiles using gin(permissions);
create index if not exists idx_materials_material_code on public.materials(material_code);
create index if not exists idx_monthly_stock_updates_month on public.monthly_stock_updates(month desc);
create index if not exists idx_monthly_stock_updates_branch_material on public.monthly_stock_updates(branch_id, material_id);
create index if not exists idx_excel_activity_logs_module_created_at on public.excel_activity_logs(module_name, created_at desc);
create index if not exists idx_deleted_material_logs_deleted_at on public.deleted_material_logs(deleted_at desc);
create index if not exists idx_audit_logs_module_name on public.audit_logs(module_name);
create index if not exists idx_audit_logs_record_id on public.audit_logs(record_id);

create trigger set_monthly_stock_updates_updated_at
before update on public.monthly_stock_updates
for each row execute procedure public.set_updated_at();

create or replace function public.current_user_manages_branch(target_branch uuid)
returns boolean
language sql
stable
as $$
  select case
    when exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role in ('superadmin', 'admin')
        and is_active = true
        and approval_status = 'approved'
    ) then true
    when exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and target_branch = any(managed_branch_ids)
        and is_active = true
        and approval_status = 'approved'
    ) then true
    else false
  end;
$$;

create or replace view public.branch_material_stock_report as
select
  bi.id as inventory_id,
  bi.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  bi.material_id,
  m.name as material_name,
  m.material_code,
  m.category,
  m.unit_of_measure,
  bi.opening_stock,
  bi.available_quantity as current_stock,
  bi.reorder_level as minimum_stock_alert_level,
  bi.status,
  creator.full_name as created_by_name,
  updater.full_name as updated_by_name,
  bi.created_at,
  bi.updated_at
from public.branch_inventory bi
join public.branches b on b.id = bi.branch_id
join public.materials m on m.id = bi.material_id
left join public.profiles creator on creator.id = bi.created_by
left join public.profiles updater on updater.id = bi.updated_by;

create or replace view public.monthly_stock_report as
select
  msu.id,
  msu.branch_id,
  b.name as branch_name,
  msu.material_id,
  m.name as material_name,
  m.material_code,
  msu.month,
  msu.opening_stock,
  msu.received_stock,
  msu.used_stock,
  msu.damaged_stock,
  msu.closing_stock,
  msu.remarks,
  creator.full_name as created_by_name,
  updater.full_name as updated_by_name,
  msu.created_at,
  msu.updated_at
from public.monthly_stock_updates msu
join public.branches b on b.id = msu.branch_id
join public.materials m on m.id = msu.material_id
left join public.profiles creator on creator.id = msu.created_by
left join public.profiles updater on updater.id = msu.updated_by;

create or replace view public.material_usage_report as
select
  cl.branch_id,
  b.name as branch_name,
  cl.material_id,
  m.name as material_name,
  m.material_code,
  date_trunc('month', cl.consumed_on)::date as month,
  sum(cl.quantity)::integer as used_quantity
from public.consumption_logs cl
join public.branches b on b.id = cl.branch_id
join public.materials m on m.id = cl.material_id
group by cl.branch_id, b.name, cl.material_id, m.name, m.material_code, date_trunc('month', cl.consumed_on)::date;

create or replace view public.low_stock_alert_report as
select
  bi.id as inventory_id,
  bi.branch_id,
  b.name as branch_name,
  bi.material_id,
  m.name as material_name,
  m.material_code,
  bi.available_quantity as current_stock,
  bi.reorder_level as minimum_stock_alert_level,
  bi.nearest_expiry_date,
  case
    when bi.available_quantity <= bi.reorder_level then 'low_stock'
    when bi.nearest_expiry_date is not null and bi.nearest_expiry_date <= current_date + 30 then 'expiry_risk'
    else 'watch'
  end as alert_type
from public.branch_inventory bi
join public.branches b on b.id = bi.branch_id
join public.materials m on m.id = bi.material_id
where bi.available_quantity <= bi.reorder_level
   or (bi.nearest_expiry_date is not null and bi.nearest_expiry_date <= current_date + 30);

create or replace view public.dispatch_report as
select
  d.id,
  d.dispatch_number,
  d.dispatch_date,
  d.branch_id,
  from_branch.name as dispatch_from_branch_name,
  d.dispatch_to_branch_id,
  to_branch.name as dispatch_to_branch_name,
  d.destination_name,
  d.dispatch_type,
  d.person_name,
  d.bus_name,
  d.bus_number,
  d.courier_company_name,
  d.tracking_number,
  d.lr_number,
  d.contact_number,
  d.remarks,
  d.status,
  d.received_confirmation,
  d.received_by,
  d.received_date,
  d.dispatched_at,
  c.name as client_name,
  mr.request_number
from public.dispatches d
left join public.branches from_branch on from_branch.id = d.dispatch_from_branch_id
left join public.branches to_branch on to_branch.id = d.dispatch_to_branch_id
join public.clients c on c.id = d.client_id
join public.material_requests mr on mr.id = d.request_id;

create or replace view public.user_activity_report as
select
  al.id,
  al.action,
  al.module_name,
  al.record_id,
  al.created_at,
  al.user_role,
  actor.full_name as actor_name,
  subject.full_name as subject_name
from public.audit_logs al
left join public.profiles actor on actor.id = al.actor_user_id
left join public.profiles subject on subject.id = al.subject_user_id;

create or replace view public.upload_history_report as
select
  eal.id,
  eal.module_name,
  eal.operation,
  eal.file_name,
  eal.row_count,
  eal.created_at,
  b.name as branch_name,
  p.full_name as created_by_name
from public.excel_activity_logs eal
left join public.branches b on b.id = eal.branch_id
left join public.profiles p on p.id = eal.created_by;

create or replace view public.deleted_material_report as
select
  dml.id,
  dml.material_id,
  dml.material_snapshot,
  dml.deleted_at,
  p.full_name as deleted_by_name
from public.deleted_material_logs dml
left join public.profiles p on p.id = dml.deleted_by;
