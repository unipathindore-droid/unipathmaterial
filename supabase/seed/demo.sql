insert into public.branches (id, code, name, city, state)
values
  ('11111111-1111-1111-1111-111111111111', 'IND', 'Indore Central', 'Indore', 'Madhya Pradesh'),
  ('22222222-2222-2222-2222-222222222222', 'BPL', 'Bhopal North', 'Bhopal', 'Madhya Pradesh')
on conflict (id) do nothing;

insert into public.materials (id, sku, name, category, unit_of_measure, requires_expiry_before_dispatch, reorder_level, reorder_quantity)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BLOOD-EDTA-02', 'EDTA Blood Collection Tubes', 'Collection', 'box', true, 120, 180),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'URINE-STRIP-10', 'Urine Test Strips', 'Consumables', 'pack', true, 60, 100),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'BIOHAZ-BAG-01', 'Biohazard Disposal Bags', 'Safety', 'bundle', false, 40, 60)
on conflict (id) do nothing;

insert into public.branch_inventory (
  branch_id,
  material_id,
  available_quantity,
  reserved_quantity,
  reorder_level,
  reorder_quantity,
  nearest_expiry_date
)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 92, 18, 120, 180, current_date + 7),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 41, 12, 60, 100, current_date + 13),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 65, 8, 40, 60, null)
on conflict (branch_id, material_id) do nothing;
