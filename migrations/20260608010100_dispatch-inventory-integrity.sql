create unique index if not exists dispatches_one_active_per_request_idx
  on public.dispatches (request_id)
  where status <> 'cancelled';

create index if not exists material_requests_branch_status_idx
  on public.material_requests (branch_id, status);

create index if not exists dispatches_branch_status_created_idx
  on public.dispatches (branch_id, status, created_at desc);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists email_events_branch_created_idx
  on public.email_events (branch_id, created_at desc);

create unique index if not exists reorder_recommendations_open_unique_idx
  on public.reorder_recommendations (branch_id, material_id, reason)
  where status = 'open';
