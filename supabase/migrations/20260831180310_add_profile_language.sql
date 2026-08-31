alter table public.profiles
  add column if not exists language text not null default 'en'
  constraint profiles_language_check check (language in ('en', 'ar'));

comment on column public.profiles.language is
  'ISO-style application language preference. Supported values: en and ar.';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url, language)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.raw_user_meta_data ->> 'language' = 'ar' then 'ar' else 'en' end
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
