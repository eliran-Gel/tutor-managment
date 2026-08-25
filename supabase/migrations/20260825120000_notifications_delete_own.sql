-- Users can already mark their own notifications read; this lets them
-- also delete their own (single or "clear all"), same recipient-scoping
-- as notifications_select_own/notifications_update_own.
create policy "notifications_delete_own"
  on public.notifications for delete
  using (recipient_profile_id = auth.uid());
