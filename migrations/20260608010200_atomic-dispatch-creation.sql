create or replace function public.create_dispatch_with_inventory(
  p_request_id uuid,
  p_actor_id uuid,
  p_dispatch_number text,
  p_dispatch_date date,
  p_dispatch_from_branch_id uuid,
  p_dispatch_to_branch_id uuid,
  p_destination_name text,
  p_dispatch_type public.dispatch_transport_type,
  p_person_name text,
  p_bus_name text,
  p_bus_number text,
  p_courier_name text,
  p_lr_number text,
  p_tracking_number text,
  p_contact_number text,
  p_remarks text,
  p_received_confirmation boolean,
  p_received_by text,
  p_received_date date,
  p_eta_date date,
  p_dispatch_status public.dispatch_status,
  p_items jsonb
)
returns table (dispatch_id uuid, dispatch_number text)
language plpgsql
as $$
declare
  v_request public.material_requests%rowtype;
  v_dispatch_id uuid;
  v_item jsonb;
  v_request_item public.material_request_items%rowtype;
  v_inventory public.branch_inventory%rowtype;
  v_quantity integer;
  v_has_left_preparation boolean;
begin
  if p_dispatch_status = 'cancelled'::public.dispatch_status then
    raise exception 'Cancelled dispatches cannot be created directly.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Dispatch must include at least one item.';
  end if;

  select *
    into v_request
    from public.material_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'Request details could not be loaded.';
  end if;

  if v_request.status <> 'approved'::public.request_status then
    raise exception 'Only approved requests can be dispatched.';
  end if;

  if p_dispatch_from_branch_id <> v_request.branch_id then
    raise exception 'Dispatch branch must match the approved request branch.';
  end if;

  if exists (
    select 1
      from public.dispatches d
     where d.request_id = v_request.id
       and d.status <> 'cancelled'::public.dispatch_status
  ) then
    raise exception 'This request already has an active dispatch.';
  end if;

  insert into public.dispatches (
    request_id,
    branch_id,
    dispatch_from_branch_id,
    dispatch_to_branch_id,
    client_id,
    dispatch_number,
    dispatch_date,
    destination_name,
    dispatch_type,
    person_name,
    bus_name,
    bus_number,
    courier_company_name,
    status,
    prepared_by,
    courier_name,
    lr_number,
    tracking_number,
    contact_number,
    remarks,
    received_confirmation,
    received_by,
    received_date,
    eta_date
  )
  values (
    v_request.id,
    v_request.branch_id,
    p_dispatch_from_branch_id,
    p_dispatch_to_branch_id,
    v_request.client_id,
    p_dispatch_number,
    p_dispatch_date,
    p_destination_name,
    p_dispatch_type,
    p_person_name,
    p_bus_name,
    p_bus_number,
    p_courier_name,
    'queued'::public.dispatch_status,
    p_actor_id,
    p_courier_name,
    p_lr_number,
    p_tracking_number,
    p_contact_number,
    p_remarks,
    coalesce(p_received_confirmation, false),
    p_received_by,
    p_received_date,
    p_eta_date
  )
  returning id into v_dispatch_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Dispatch item quantity must be greater than zero.';
    end if;

    select *
      into v_request_item
      from public.material_request_items
     where id = (v_item ->> 'request_item_id')::uuid
       and request_id = v_request.id
     for update;

    if not found or v_request_item.material_id <> (v_item ->> 'material_id')::uuid then
      raise exception 'One or more dispatch items do not belong to the selected request.';
    end if;

    if v_quantity > coalesce(v_request_item.approved_quantity, 0) then
      raise exception 'Dispatch quantity cannot exceed approved quantity.';
    end if;

    select *
      into v_inventory
      from public.branch_inventory
     where id = (v_item ->> 'branch_inventory_id')::uuid
       and branch_id = v_request.branch_id
     for update;

    if not found or v_inventory.material_id <> (v_item ->> 'material_id')::uuid then
      raise exception 'One or more inventory records do not match the selected request materials.';
    end if;

    if v_quantity > v_inventory.available_quantity then
      raise exception 'Dispatch quantity cannot exceed available branch inventory.';
    end if;

    insert into public.dispatch_items (
      dispatch_id,
      request_item_id,
      material_id,
      branch_inventory_id,
      quantity,
      batch_number,
      expiry_date
    )
    values (
      v_dispatch_id,
      v_request_item.id,
      v_request_item.material_id,
      v_inventory.id,
      v_quantity,
      nullif(v_item ->> 'batch_number', ''),
      nullif(v_item ->> 'expiry_date', '')::date
    );

    update public.branch_inventory
       set available_quantity = available_quantity - v_quantity,
           updated_by = p_actor_id,
           updated_at = timezone('utc', now())
     where id = v_inventory.id;
  end loop;

  update public.material_requests
     set status = 'dispatched'::public.request_status,
         updated_at = timezone('utc', now())
   where id = v_request.id;

  v_has_left_preparation := p_dispatch_status in (
    'dispatched'::public.dispatch_status,
    'delivered'::public.dispatch_status
  );

  update public.dispatches
     set status = p_dispatch_status,
         dispatched_by = case when v_has_left_preparation then p_actor_id else null end,
         dispatched_at = case when v_has_left_preparation then timezone('utc', now()) else null end,
         updated_at = timezone('utc', now())
   where id = v_dispatch_id;

  dispatch_id := v_dispatch_id;
  dispatch_number := p_dispatch_number;
  return next;
end;
$$;
