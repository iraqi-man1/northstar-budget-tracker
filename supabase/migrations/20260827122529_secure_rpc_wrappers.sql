-- Keep privileged mutation bodies outside the Data API's exposed public schema.
-- Public RPCs below are SECURITY INVOKER wrappers, so Supabase can expose a
-- stable client API without exposing SECURITY DEFINER functions directly.

alter function public.create_income_entry(uuid, numeric, date, text, text) set schema private;
alter function public.update_income_entry(uuid, uuid, numeric, date, text, text) set schema private;
alter function public.delete_income_entry(uuid) set schema private;
alter function public.create_expense_entry(uuid, numeric, date, text, text) set schema private;
alter function public.update_expense_entry(uuid, uuid, numeric, date, text, text) set schema private;
alter function public.delete_expense_entry(uuid) set schema private;
alter function public.create_savings_account(text, text, text, text) set schema private;
alter function public.update_savings_account(uuid, text, text, text, text) set schema private;
alter function public.delete_savings_account(uuid) set schema private;
alter function public.record_savings_deposit(uuid, numeric, date, text) set schema private;
alter function public.record_savings_withdrawal(uuid, numeric, date, text) set schema private;
alter function public.record_savings_transfer(uuid, uuid, numeric, date, text) set schema private;
alter function public.create_goal(text, numeric, date, text) set schema private;
alter function public.update_goal(uuid, text, numeric, date, text) set schema private;
alter function public.delete_goal(uuid) set schema private;
alter function public.record_goal_deposit(uuid, numeric, date, text) set schema private;
alter function public.record_goal_withdrawal(uuid, numeric, date, text) set schema private;

grant usage on schema private to authenticated;

revoke all on function private.create_income_entry(uuid, numeric, date, text, text) from public, anon;
revoke all on function private.update_income_entry(uuid, uuid, numeric, date, text, text) from public, anon;
revoke all on function private.delete_income_entry(uuid) from public, anon;
revoke all on function private.create_expense_entry(uuid, numeric, date, text, text) from public, anon;
revoke all on function private.update_expense_entry(uuid, uuid, numeric, date, text, text) from public, anon;
revoke all on function private.delete_expense_entry(uuid) from public, anon;
revoke all on function private.create_savings_account(text, text, text, text) from public, anon;
revoke all on function private.update_savings_account(uuid, text, text, text, text) from public, anon;
revoke all on function private.delete_savings_account(uuid) from public, anon;
revoke all on function private.record_savings_deposit(uuid, numeric, date, text) from public, anon;
revoke all on function private.record_savings_withdrawal(uuid, numeric, date, text) from public, anon;
revoke all on function private.record_savings_transfer(uuid, uuid, numeric, date, text) from public, anon;
revoke all on function private.create_goal(text, numeric, date, text) from public, anon;
revoke all on function private.update_goal(uuid, text, numeric, date, text) from public, anon;
revoke all on function private.delete_goal(uuid) from public, anon;
revoke all on function private.record_goal_deposit(uuid, numeric, date, text) from public, anon;
revoke all on function private.record_goal_withdrawal(uuid, numeric, date, text) from public, anon;

grant execute on function private.create_income_entry(uuid, numeric, date, text, text) to authenticated;
grant execute on function private.update_income_entry(uuid, uuid, numeric, date, text, text) to authenticated;
grant execute on function private.delete_income_entry(uuid) to authenticated;
grant execute on function private.create_expense_entry(uuid, numeric, date, text, text) to authenticated;
grant execute on function private.update_expense_entry(uuid, uuid, numeric, date, text, text) to authenticated;
grant execute on function private.delete_expense_entry(uuid) to authenticated;
grant execute on function private.create_savings_account(text, text, text, text) to authenticated;
grant execute on function private.update_savings_account(uuid, text, text, text, text) to authenticated;
grant execute on function private.delete_savings_account(uuid) to authenticated;
grant execute on function private.record_savings_deposit(uuid, numeric, date, text) to authenticated;
grant execute on function private.record_savings_withdrawal(uuid, numeric, date, text) to authenticated;
grant execute on function private.record_savings_transfer(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function private.create_goal(text, numeric, date, text) to authenticated;
grant execute on function private.update_goal(uuid, text, numeric, date, text) to authenticated;
grant execute on function private.delete_goal(uuid) to authenticated;
grant execute on function private.record_goal_deposit(uuid, numeric, date, text) to authenticated;
grant execute on function private.record_goal_withdrawal(uuid, numeric, date, text) to authenticated;

create or replace function public.create_income_entry(
  p_source_id uuid, p_amount numeric, p_received_on date, p_description text, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.create_income_entry(p_source_id, p_amount, p_received_on, p_description, p_notes);
$$;

create or replace function public.update_income_entry(
  p_id uuid, p_source_id uuid, p_amount numeric, p_received_on date, p_description text, p_notes text
) returns void
language sql security invoker set search_path = ''
as $$
  select private.update_income_entry(p_id, p_source_id, p_amount, p_received_on, p_description, p_notes);
$$;

create or replace function public.delete_income_entry(p_id uuid) returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_income_entry(p_id);
$$;

create or replace function public.create_expense_entry(
  p_category_id uuid, p_amount numeric, p_spent_on date, p_merchant text, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.create_expense_entry(p_category_id, p_amount, p_spent_on, p_merchant, p_notes);
$$;

create or replace function public.update_expense_entry(
  p_id uuid, p_category_id uuid, p_amount numeric, p_spent_on date, p_merchant text, p_notes text
) returns void
language sql security invoker set search_path = ''
as $$
  select private.update_expense_entry(p_id, p_category_id, p_amount, p_spent_on, p_merchant, p_notes);
$$;

create or replace function public.delete_expense_entry(p_id uuid) returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_expense_entry(p_id);
$$;

create or replace function public.create_savings_account(
  p_name text, p_account_type text, p_institution text, p_color text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.create_savings_account(p_name, p_account_type, p_institution, p_color);
$$;

create or replace function public.update_savings_account(
  p_id uuid, p_name text, p_account_type text, p_institution text, p_color text
) returns void
language sql security invoker set search_path = ''
as $$
  select private.update_savings_account(p_id, p_name, p_account_type, p_institution, p_color);
$$;

create or replace function public.delete_savings_account(p_id uuid) returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_savings_account(p_id);
$$;

create or replace function public.record_savings_deposit(
  p_account_id uuid, p_amount numeric, p_date date, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.record_savings_deposit(p_account_id, p_amount, p_date, p_notes);
$$;

create or replace function public.record_savings_withdrawal(
  p_account_id uuid, p_amount numeric, p_date date, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.record_savings_withdrawal(p_account_id, p_amount, p_date, p_notes);
$$;

create or replace function public.record_savings_transfer(
  p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_date date, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.record_savings_transfer(p_from_account_id, p_to_account_id, p_amount, p_date, p_notes);
$$;

create or replace function public.create_goal(
  p_name text, p_target_amount numeric, p_target_date date, p_color text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.create_goal(p_name, p_target_amount, p_target_date, p_color);
$$;

create or replace function public.update_goal(
  p_id uuid, p_name text, p_target_amount numeric, p_target_date date, p_color text
) returns void
language sql security invoker set search_path = ''
as $$
  select private.update_goal(p_id, p_name, p_target_amount, p_target_date, p_color);
$$;

create or replace function public.delete_goal(p_id uuid) returns void
language sql security invoker set search_path = ''
as $$
  select private.delete_goal(p_id);
$$;

create or replace function public.record_goal_deposit(
  p_goal_id uuid, p_amount numeric, p_date date, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.record_goal_deposit(p_goal_id, p_amount, p_date, p_notes);
$$;

create or replace function public.record_goal_withdrawal(
  p_goal_id uuid, p_amount numeric, p_date date, p_notes text
) returns uuid
language sql security invoker set search_path = ''
as $$
  select private.record_goal_withdrawal(p_goal_id, p_amount, p_date, p_notes);
$$;

-- Function creation grants EXECUTE to PUBLIC by default, so close each wrapper
-- before granting the authenticated role explicitly.
revoke all on function public.create_income_entry(uuid, numeric, date, text, text) from public, anon;
revoke all on function public.update_income_entry(uuid, uuid, numeric, date, text, text) from public, anon;
revoke all on function public.delete_income_entry(uuid) from public, anon;
revoke all on function public.create_expense_entry(uuid, numeric, date, text, text) from public, anon;
revoke all on function public.update_expense_entry(uuid, uuid, numeric, date, text, text) from public, anon;
revoke all on function public.delete_expense_entry(uuid) from public, anon;
revoke all on function public.create_savings_account(text, text, text, text) from public, anon;
revoke all on function public.update_savings_account(uuid, text, text, text, text) from public, anon;
revoke all on function public.delete_savings_account(uuid) from public, anon;
revoke all on function public.record_savings_deposit(uuid, numeric, date, text) from public, anon;
revoke all on function public.record_savings_withdrawal(uuid, numeric, date, text) from public, anon;
revoke all on function public.record_savings_transfer(uuid, uuid, numeric, date, text) from public, anon;
revoke all on function public.create_goal(text, numeric, date, text) from public, anon;
revoke all on function public.update_goal(uuid, text, numeric, date, text) from public, anon;
revoke all on function public.delete_goal(uuid) from public, anon;
revoke all on function public.record_goal_deposit(uuid, numeric, date, text) from public, anon;
revoke all on function public.record_goal_withdrawal(uuid, numeric, date, text) from public, anon;

grant execute on function public.create_income_entry(uuid, numeric, date, text, text) to authenticated;
grant execute on function public.update_income_entry(uuid, uuid, numeric, date, text, text) to authenticated;
grant execute on function public.delete_income_entry(uuid) to authenticated;
grant execute on function public.create_expense_entry(uuid, numeric, date, text, text) to authenticated;
grant execute on function public.update_expense_entry(uuid, uuid, numeric, date, text, text) to authenticated;
grant execute on function public.delete_expense_entry(uuid) to authenticated;
grant execute on function public.create_savings_account(text, text, text, text) to authenticated;
grant execute on function public.update_savings_account(uuid, text, text, text, text) to authenticated;
grant execute on function public.delete_savings_account(uuid) to authenticated;
grant execute on function public.record_savings_deposit(uuid, numeric, date, text) to authenticated;
grant execute on function public.record_savings_withdrawal(uuid, numeric, date, text) to authenticated;
grant execute on function public.record_savings_transfer(uuid, uuid, numeric, date, text) to authenticated;
grant execute on function public.create_goal(text, numeric, date, text) to authenticated;
grant execute on function public.update_goal(uuid, text, numeric, date, text) to authenticated;
grant execute on function public.delete_goal(uuid) to authenticated;
grant execute on function public.record_goal_deposit(uuid, numeric, date, text) to authenticated;
grant execute on function public.record_goal_withdrawal(uuid, numeric, date, text) to authenticated;
