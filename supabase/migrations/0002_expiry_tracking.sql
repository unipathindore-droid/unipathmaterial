create table if not exists public.expiry_alert_log (
  id uuid primary key default gen_random_uuid(),
  branch_inventory_id uuid not null references public.branch_inventory(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  material_id uuid not null references public.materials(id) on delete cascade,
  threshold_days integer not null check (threshold_days in (30, 15, 7)),
  alert_type public.notification_kind not null check (alert_type in ('internal', 'client_email')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (branch_inventory_id, threshold_days, alert_type)
);

create index if not exists idx_expiry_alert_log_branch_inventory
  on public.expiry_alert_log(branch_inventory_id, threshold_days, alert_type);

create or replace view public.expiry_tracking_overview as
select
  bi.id as branch_inventory_id,
  bi.branch_id,
  b.name as branch_name,
  bi.material_id,
  m.name as material_name,
  bi.available_quantity,
  bi.nearest_expiry_date,
  greatest((bi.nearest_expiry_date - current_date), 0) as days_to_expiry
from public.branch_inventory bi
join public.branches b on b.id = bi.branch_id
join public.materials m on m.id = bi.material_id
where bi.nearest_expiry_date is not null;

create or replace function public.process_expiry_tracking()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inventory_row record;
  internal_count integer := 0;
  email_count integer := 0;
begin
  for inventory_row in
    select
      eto.branch_inventory_id,
      eto.branch_id,
      eto.branch_name,
      eto.material_id,
      eto.material_name,
      eto.nearest_expiry_date,
      eto.days_to_expiry
    from public.expiry_tracking_overview eto
    where eto.days_to_expiry in (30, 15, 7)
  loop
    if inventory_row.days_to_expiry in (30, 15, 7)
      and not exists (
        select 1
        from public.expiry_alert_log eal
        where eal.branch_inventory_id = inventory_row.branch_inventory_id
          and eal.threshold_days = inventory_row.days_to_expiry
          and eal.alert_type = 'internal'
      )
    then
      insert into public.notifications (
        branch_id,
        title,
        body,
        kind,
        route
      )
      values (
        inventory_row.branch_id,
        format('%s expires in %s days', inventory_row.material_name, inventory_row.days_to_expiry),
        format(
          '%s stock in %s reaches expiry on %s. Review stock movement and replacement planning.',
          inventory_row.material_name,
          inventory_row.branch_name,
          inventory_row.nearest_expiry_date
        ),
        'internal',
        '/materials'
      );

      insert into public.expiry_alert_log (
        branch_inventory_id,
        branch_id,
        material_id,
        threshold_days,
        alert_type
      )
      values (
        inventory_row.branch_inventory_id,
        inventory_row.branch_id,
        inventory_row.material_id,
        inventory_row.days_to_expiry,
        'internal'
      );

      internal_count := internal_count + 1;
    end if;

    if inventory_row.days_to_expiry = 7
      and not exists (
        select 1
        from public.expiry_alert_log eal
        where eal.branch_inventory_id = inventory_row.branch_inventory_id
          and eal.threshold_days = 7
          and eal.alert_type = 'client_email'
      )
    then
      insert into public.email_events (
        client_id,
        branch_id,
        material_id,
        event_type,
        recipient_email,
        payload
      )
      select
        c.id,
        inventory_row.branch_id,
        inventory_row.material_id,
        'expiry_warning',
        c.email,
        jsonb_build_object(
          'material_name', inventory_row.material_name,
          'days_to_expiry', inventory_row.days_to_expiry,
          'expiry_date', inventory_row.nearest_expiry_date
        )
      from public.clients c
      where c.branch_id = inventory_row.branch_id
        and c.status = 'active'
        and c.email is not null;

      insert into public.notifications (
        branch_id,
        title,
        body,
        kind,
        route
      )
      values (
        inventory_row.branch_id,
        format('Expiry email queued for %s', inventory_row.material_name),
        format(
          'Client email queue created for materials expiring in 7 days in %s.',
          inventory_row.branch_name
        ),
        'client_email',
        '/dispatch'
      );

      insert into public.expiry_alert_log (
        branch_inventory_id,
        branch_id,
        material_id,
        threshold_days,
        alert_type
      )
      values (
        inventory_row.branch_inventory_id,
        inventory_row.branch_id,
        inventory_row.material_id,
        7,
        'client_email'
      );

      email_count := email_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'internal_alerts_created', internal_count,
    'client_email_events_created', email_count,
    'processed_at', timezone('utc', now())
  );
end;
$$;

comment on function public.process_expiry_tracking()
is 'Run daily via Supabase cron or scheduled function. Creates 30/15-day internal alerts and 7-day internal + email alerts.';
