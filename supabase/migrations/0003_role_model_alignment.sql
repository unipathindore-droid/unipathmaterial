alter type public.app_role add value if not exists 'phlebotomist';
alter type public.app_role add value if not exists 'dispatch_manager';

do $$
begin
  begin
    alter type public.app_role rename value 'dispatch' to 'dispatch_manager';
  exception
    when invalid_parameter_value then null;
    when undefined_object then null;
  end;
end $$;

update public.profiles
set role = 'dispatch_manager'
where role::text = 'dispatch';

drop policy if exists "clients_manage" on public.clients;
create policy "clients_manage" on public.clients
for all using (
  public.has_role(array['admin', 'branch_admin']::public.app_role[])
  and public.can_access_branch(branch_id)
)
with check (
  public.has_role(array['admin', 'branch_admin']::public.app_role[])
  and public.can_access_branch(branch_id)
);

drop policy if exists "requests_manage" on public.material_requests;
create policy "requests_manage" on public.material_requests
for all using (
  (
    public.has_role(array['admin', 'branch_admin']::public.app_role[])
    and public.can_access_branch(branch_id)
  )
  or (
    public.has_role(array['sales', 'phlebotomist']::public.app_role[])
    and requested_by = auth.uid()
    and public.can_access_branch(branch_id)
  )
)
with check (
  (
    public.has_role(array['admin', 'branch_admin']::public.app_role[])
    and public.can_access_branch(branch_id)
  )
  or (
    public.has_role(array['sales', 'phlebotomist']::public.app_role[])
    and requested_by = auth.uid()
    and public.can_access_branch(branch_id)
  )
);

drop policy if exists "request_items_manage" on public.material_request_items;
create policy "request_items_manage" on public.material_request_items
for all using (
  exists (
    select 1
    from public.material_requests mr
    where mr.id = request_id
      and public.can_access_branch(mr.branch_id)
      and (
        public.has_role(array['admin', 'branch_admin']::public.app_role[])
        or (
          public.has_role(array['sales', 'phlebotomist']::public.app_role[])
          and mr.requested_by = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.material_requests mr
    where mr.id = request_id
      and public.can_access_branch(mr.branch_id)
      and (
        public.has_role(array['admin', 'branch_admin']::public.app_role[])
        or (
          public.has_role(array['sales', 'phlebotomist']::public.app_role[])
          and mr.requested_by = auth.uid()
        )
      )
  )
);

drop policy if exists "dispatches_manage" on public.dispatches;
create policy "dispatches_manage" on public.dispatches
for all using (
  public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  and public.can_access_branch(branch_id)
)
with check (
  public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  and public.can_access_branch(branch_id)
);

drop policy if exists "dispatch_items_manage" on public.dispatch_items;
create policy "dispatch_items_manage" on public.dispatch_items
for all using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  )
);

drop policy if exists "deliveries_manage" on public.deliveries;
create policy "deliveries_manage" on public.deliveries
for all using (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  )
)
with check (
  exists (
    select 1 from public.dispatches d
    where d.id = dispatch_id
      and public.can_access_branch(d.branch_id)
      and public.has_role(array['admin', 'dispatch_manager']::public.app_role[])
  )
);

drop policy if exists "email_events_manage" on public.email_events;
create policy "email_events_manage" on public.email_events
for all using (
  public.has_role(array['admin', 'dispatch_manager', 'material_team']::public.app_role[])
  and public.can_access_branch(branch_id)
)
with check (
  public.has_role(array['admin', 'dispatch_manager', 'material_team']::public.app_role[])
  and public.can_access_branch(branch_id)
);
