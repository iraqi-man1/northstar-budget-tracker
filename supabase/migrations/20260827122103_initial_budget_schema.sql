-- Northstar Budget Tracker
-- Atomic, per-user financial model for Supabase/PostgreSQL.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  icon text not null default 'receipt',
  color text not null default '#6F7DFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index expense_categories_user_name_key on public.expense_categories (user_id, lower(name));
create index expense_categories_user_id_idx on public.expense_categories (user_id);

create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#2DAA79' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index income_sources_user_name_key on public.income_sources (user_id, lower(name));
create index income_sources_user_id_idx on public.income_sources (user_id);

create table public.income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.income_sources(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  received_on date not null default current_date,
  description text not null check (char_length(trim(description)) between 1 and 160),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index income_user_date_idx on public.income (user_id, received_on desc);
create index income_source_id_idx on public.income (source_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  spent_on date not null default current_date,
  merchant text not null check (char_length(trim(merchant)) between 1 and 160),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_user_date_idx on public.expenses (user_id, spent_on desc);
create index expenses_category_id_idx on public.expenses (category_id);

create table public.savings_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  account_type text not null default 'savings' check (account_type in ('savings', 'money_market', 'investment', 'cash')),
  institution text check (institution is null or char_length(institution) <= 100),
  color text not null default '#14A6A6' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index savings_accounts_user_name_key on public.savings_accounts (user_id, lower(name));
create index savings_accounts_user_id_idx on public.savings_accounts (user_id);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date date,
  color text not null default '#EE8D5A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_status_idx on public.goals (user_id, status);
create index goals_target_date_idx on public.goals (user_id, target_date);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'income', 'expense', 'savings_deposit', 'savings_withdrawal',
    'savings_transfer', 'goal_deposit', 'goal_withdrawal'
  )),
  amount numeric(14,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  description text not null check (char_length(trim(description)) between 1 and 200),
  notes text check (notes is null or char_length(notes) <= 1000),
  income_id uuid unique references public.income(id) on delete cascade,
  expense_id uuid unique references public.expenses(id) on delete cascade,
  savings_account_id uuid references public.savings_accounts(id) on delete set null,
  destination_savings_account_id uuid references public.savings_accounts(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc, created_at desc);
create index transactions_user_type_idx on public.transactions (user_id, type);
create index transactions_savings_account_idx on public.transactions (savings_account_id);
create index transactions_destination_account_idx on public.transactions (destination_savings_account_id);
create index transactions_goal_idx on public.transactions (goal_id);

comment on table public.transactions is 'Immutable activity ledger. Savings transfers are represented by exactly one row and are excluded from allocation totals.';
comment on column public.savings_accounts.balance is 'Current allocated savings. Changed only by authenticated RPC functions.';
comment on column public.goals.current_amount is 'Current allocated goal funds. Changed only by authenticated RPC functions.';

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger expense_categories_set_updated_at before update on public.expense_categories for each row execute function private.set_updated_at();
create trigger income_sources_set_updated_at before update on public.income_sources for each row execute function private.set_updated_at();
create trigger income_set_updated_at before update on public.income for each row execute function private.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function private.set_updated_at();
create trigger savings_accounts_set_updated_at before update on public.savings_accounts for each row execute function private.set_updated_at();
create trigger goals_set_updated_at before update on public.goals for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;

  insert into public.expense_categories (user_id, name, icon, color) values
    (new.id, 'Housing', 'house', '#6F7DFF'),
    (new.id, 'Food & dining', 'utensils', '#EE8D5A'),
    (new.id, 'Transport', 'car', '#14A6A6'),
    (new.id, 'Shopping', 'shopping-bag', '#C86BDD'),
    (new.id, 'Health', 'heart-pulse', '#E65B65'),
    (new.id, 'Bills & utilities', 'receipt', '#D29B32'),
    (new.id, 'Entertainment', 'sparkles', '#477EEA'),
    (new.id, 'Other', 'shapes', '#7A8582')
  on conflict do nothing;

  insert into public.income_sources (user_id, name, color) values
    (new.id, 'Salary', '#2DAA79'),
    (new.id, 'Freelance', '#477EEA')
  on conflict do nothing;

  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- RLS: every record is owned by exactly one authenticated user.
alter table public.profiles enable row level security;
alter table public.expense_categories enable row level security;
alter table public.income_sources enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.savings_accounts enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy "categories_select_own" on public.expense_categories for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.expense_categories for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.expense_categories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.expense_categories for delete to authenticated using ((select auth.uid()) = user_id);

create policy "sources_select_own" on public.income_sources for select to authenticated using ((select auth.uid()) = user_id);
create policy "sources_insert_own" on public.income_sources for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sources_update_own" on public.income_sources for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sources_delete_own" on public.income_sources for delete to authenticated using ((select auth.uid()) = user_id);

create policy "income_select_own" on public.income for select to authenticated using ((select auth.uid()) = user_id);
create policy "income_insert_own" on public.income for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "income_update_own" on public.income for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "income_delete_own" on public.income for delete to authenticated using ((select auth.uid()) = user_id);

create policy "expenses_select_own" on public.expenses for select to authenticated using ((select auth.uid()) = user_id);
create policy "expenses_insert_own" on public.expenses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "expenses_update_own" on public.expenses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "expenses_delete_own" on public.expenses for delete to authenticated using ((select auth.uid()) = user_id);

create policy "savings_select_own" on public.savings_accounts for select to authenticated using ((select auth.uid()) = user_id);
create policy "savings_insert_own" on public.savings_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "savings_update_own" on public.savings_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "savings_delete_own" on public.savings_accounts for delete to authenticated using ((select auth.uid()) = user_id);

create policy "goals_select_own" on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "transactions_select_own" on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "transactions_update_own" on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_delete_own" on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);

-- Explicit grants keep the app working when new tables are not automatically exposed to the Data API.
revoke all on table public.profiles, public.expense_categories, public.income_sources, public.income, public.expenses,
  public.savings_accounts, public.goals, public.transactions from anon, authenticated;
grant select on table public.profiles, public.expense_categories, public.income_sources, public.income, public.expenses,
  public.savings_accounts, public.goals, public.transactions to authenticated;
grant insert, update, delete on table public.profiles, public.expense_categories, public.income_sources to authenticated;

-- Atomic mutation functions. SECURITY DEFINER is used only to protect ledger/balance integrity.
-- Each function has a fixed search_path, checks auth.uid(), filters every row by that uid,
-- and is explicitly unavailable to PUBLIC and anon.

create or replace function public.create_income_entry(
  p_source_id uuid, p_amount numeric, p_received_on date, p_description text, p_notes text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_description text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_source_id is not null and not exists (
    select 1 from public.income_sources where id = p_source_id and user_id = v_user_id
  ) then raise exception 'Income source not found'; end if;
  v_description := coalesce(nullif(trim(p_description), ''), (select name from public.income_sources where id = p_source_id and user_id = v_user_id), 'Income');
  insert into public.income (user_id, source_id, amount, received_on, description, notes)
  values (v_user_id, p_source_id, p_amount, coalesce(p_received_on, current_date), v_description, nullif(trim(p_notes), '')) returning id into v_id;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, income_id)
  values (v_user_id, 'income', p_amount, coalesce(p_received_on, current_date), v_description, nullif(trim(p_notes), ''), v_id);
  return v_id;
end;
$$;

create or replace function public.update_income_entry(
  p_id uuid, p_source_id uuid, p_amount numeric, p_received_on date, p_description text, p_notes text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_description text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_source_id is not null and not exists (select 1 from public.income_sources where id = p_source_id and user_id = v_user_id) then raise exception 'Income source not found'; end if;
  v_description := coalesce(nullif(trim(p_description), ''), (select name from public.income_sources where id = p_source_id and user_id = v_user_id), 'Income');
  update public.income set source_id = p_source_id, amount = p_amount, received_on = coalesce(p_received_on, current_date), description = v_description, notes = nullif(trim(p_notes), '')
  where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Income entry not found'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, income_id)
  values (v_user_id, 'income', p_amount, coalesce(p_received_on, current_date), v_description, nullif(trim(p_notes), ''), p_id)
  on conflict (income_id) do update set amount = excluded.amount, transaction_date = excluded.transaction_date, description = excluded.description, notes = excluded.notes;
end;
$$;

create or replace function public.delete_income_entry(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.income where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Income entry not found'; end if;
end;
$$;

create or replace function public.create_expense_entry(
  p_category_id uuid, p_amount numeric, p_spent_on date, p_merchant text, p_notes text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_merchant text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_category_id is not null and not exists (select 1 from public.expense_categories where id = p_category_id and user_id = v_user_id) then raise exception 'Expense category not found'; end if;
  v_merchant := nullif(trim(p_merchant), '');
  if v_merchant is null then raise exception 'Merchant is required'; end if;
  insert into public.expenses (user_id, category_id, amount, spent_on, merchant, notes)
  values (v_user_id, p_category_id, p_amount, coalesce(p_spent_on, current_date), v_merchant, nullif(trim(p_notes), '')) returning id into v_id;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, expense_id)
  values (v_user_id, 'expense', p_amount, coalesce(p_spent_on, current_date), v_merchant, nullif(trim(p_notes), ''), v_id);
  return v_id;
end;
$$;

create or replace function public.update_expense_entry(
  p_id uuid, p_category_id uuid, p_amount numeric, p_spent_on date, p_merchant text, p_notes text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_merchant text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_category_id is not null and not exists (select 1 from public.expense_categories where id = p_category_id and user_id = v_user_id) then raise exception 'Expense category not found'; end if;
  v_merchant := nullif(trim(p_merchant), '');
  if v_merchant is null then raise exception 'Merchant is required'; end if;
  update public.expenses set category_id = p_category_id, amount = p_amount, spent_on = coalesce(p_spent_on, current_date), merchant = v_merchant, notes = nullif(trim(p_notes), '')
  where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Expense entry not found'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, expense_id)
  values (v_user_id, 'expense', p_amount, coalesce(p_spent_on, current_date), v_merchant, nullif(trim(p_notes), ''), p_id)
  on conflict (expense_id) do update set amount = excluded.amount, transaction_date = excluded.transaction_date, description = excluded.description, notes = excluded.notes;
end;
$$;

create or replace function public.delete_expense_entry(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.expenses where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Expense entry not found'; end if;
end;
$$;

create or replace function public.create_savings_account(
  p_name text, p_account_type text, p_institution text, p_color text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Account name is required'; end if;
  insert into public.savings_accounts (user_id, name, account_type, institution, color)
  values (v_user_id, trim(p_name), coalesce(p_account_type, 'savings'), nullif(trim(p_institution), ''), coalesce(p_color, '#14A6A6')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_savings_account(
  p_id uuid, p_name text, p_account_type text, p_institution text, p_color text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Account name is required'; end if;
  update public.savings_accounts set name = trim(p_name), account_type = p_account_type, institution = nullif(trim(p_institution), ''), color = p_color
  where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Savings account not found'; end if;
end;
$$;

create or replace function public.delete_savings_account(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.savings_accounts where id = p_id and user_id = v_user_id and balance = 0;
  if not found then raise exception 'Empty the account before deleting it'; end if;
end;
$$;

create or replace function public.record_savings_deposit(p_account_id uuid, p_amount numeric, p_date date, p_notes text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_tx_id uuid; v_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  update public.savings_accounts set balance = balance + p_amount where id = p_account_id and user_id = v_user_id returning name into v_name;
  if not found then raise exception 'Savings account not found'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, savings_account_id)
  values (v_user_id, 'savings_deposit', p_amount, coalesce(p_date, current_date), 'Deposit to ' || v_name, nullif(trim(p_notes), ''), p_account_id) returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create or replace function public.record_savings_withdrawal(p_account_id uuid, p_amount numeric, p_date date, p_notes text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_tx_id uuid; v_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  update public.savings_accounts set balance = balance - p_amount where id = p_account_id and user_id = v_user_id and balance >= p_amount returning name into v_name;
  if not found then raise exception 'Insufficient savings balance'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, savings_account_id)
  values (v_user_id, 'savings_withdrawal', p_amount, coalesce(p_date, current_date), 'Withdrawal from ' || v_name, nullif(trim(p_notes), ''), p_account_id) returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create or replace function public.record_savings_transfer(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_date date, p_notes text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_tx_id uuid; v_from_name text; v_to_name text; v_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_from_account_id = p_to_account_id then raise exception 'Choose two different accounts'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select count(*) into v_count from public.savings_accounts where user_id = v_user_id and id in (p_from_account_id, p_to_account_id);
  if v_count <> 2 then raise exception 'Savings account not found'; end if;
  perform 1 from public.savings_accounts where user_id = v_user_id and id in (p_from_account_id, p_to_account_id) order by id for update;
  select name into v_from_name from public.savings_accounts where id = p_from_account_id and user_id = v_user_id;
  select name into v_to_name from public.savings_accounts where id = p_to_account_id and user_id = v_user_id;
  update public.savings_accounts set balance = balance - p_amount where id = p_from_account_id and user_id = v_user_id and balance >= p_amount;
  if not found then raise exception 'Insufficient savings balance'; end if;
  update public.savings_accounts set balance = balance + p_amount where id = p_to_account_id and user_id = v_user_id;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, savings_account_id, destination_savings_account_id)
  values (v_user_id, 'savings_transfer', p_amount, coalesce(p_date, current_date), v_from_name || ' to ' || v_to_name, nullif(trim(p_notes), ''), p_from_account_id, p_to_account_id) returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create or replace function public.create_goal(p_name text, p_target_amount numeric, p_target_date date, p_color text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Goal name is required'; end if;
  if p_target_amount is null or p_target_amount <= 0 then raise exception 'Target must be greater than zero'; end if;
  insert into public.goals (user_id, name, target_amount, target_date, color)
  values (v_user_id, trim(p_name), p_target_amount, p_target_date, coalesce(p_color, '#EE8D5A')) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_goal(p_id uuid, p_name text, p_target_amount numeric, p_target_date date, p_color text) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Goal name is required'; end if;
  if p_target_amount is null or p_target_amount <= 0 then raise exception 'Target must be greater than zero'; end if;
  update public.goals set name = trim(p_name), target_amount = p_target_amount, target_date = p_target_date, color = p_color,
    status = case when current_amount >= p_target_amount then 'completed' else 'active' end
  where id = p_id and user_id = v_user_id;
  if not found then raise exception 'Goal not found'; end if;
end;
$$;

create or replace function public.delete_goal(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.goals where id = p_id and user_id = v_user_id and current_amount = 0;
  if not found then raise exception 'Withdraw allocated money before deleting this goal'; end if;
end;
$$;

create or replace function public.record_goal_deposit(p_goal_id uuid, p_amount numeric, p_date date, p_notes text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_tx_id uuid; v_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  update public.goals set current_amount = current_amount + p_amount,
    status = case when current_amount + p_amount >= target_amount then 'completed' else 'active' end
  where id = p_goal_id and user_id = v_user_id returning name into v_name;
  if not found then raise exception 'Goal not found'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, goal_id)
  values (v_user_id, 'goal_deposit', p_amount, coalesce(p_date, current_date), 'Contribution to ' || v_name, nullif(trim(p_notes), ''), p_goal_id) returning id into v_tx_id;
  return v_tx_id;
end;
$$;

create or replace function public.record_goal_withdrawal(p_goal_id uuid, p_amount numeric, p_date date, p_notes text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_tx_id uuid; v_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  update public.goals set current_amount = current_amount - p_amount,
    status = case when current_amount - p_amount >= target_amount then 'completed' else 'active' end
  where id = p_goal_id and user_id = v_user_id and current_amount >= p_amount returning name into v_name;
  if not found then raise exception 'Insufficient goal balance'; end if;
  insert into public.transactions (user_id, type, amount, transaction_date, description, notes, goal_id)
  values (v_user_id, 'goal_withdrawal', p_amount, coalesce(p_date, current_date), 'Withdrawal from ' || v_name, nullif(trim(p_notes), ''), p_goal_id) returning id into v_tx_id;
  return v_tx_id;
end;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default; close every RPC before granting authenticated access.
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
