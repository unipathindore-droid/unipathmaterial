alter table public.clients
  add column if not exists contact_person text,
  add column if not exists state text;
