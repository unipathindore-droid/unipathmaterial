create unique index if not exists idx_dispatches_one_active_per_request
  on public.dispatches(request_id)
  where status <> 'cancelled';

create index if not exists idx_material_requests_branch_status
  on public.material_requests(branch_id, status);

create index if not exists idx_dispatches_branch_status_created_at
  on public.dispatches(branch_id, status, created_at desc);

create index if not exists idx_notifications_recipient_created_at
  on public.notifications(recipient_user_id, created_at desc);

create index if not exists idx_email_events_branch_created_at
  on public.email_events(branch_id, created_at desc);

create unique index if not exists idx_reorder_recommendations_open_unique
  on public.reorder_recommendations(branch_id, material_id, reason)
  where status = 'open';
