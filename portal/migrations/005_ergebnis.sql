-- Result page (2e): the customer confirms that acute access data was renewed. Nothing else is writable for the customer.
alter table check_results_public add column acute_ack_at timestamptz;
create policy check_results_public_ack on check_results_public for update
  using (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  with check (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
grant update (acute_ack_at) on check_results_public to livedock_app;
