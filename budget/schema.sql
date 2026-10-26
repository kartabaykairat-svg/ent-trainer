-- Семейный бюджет: таблицы для Supabase.
-- Скопируйте весь этот текст в Supabase → SQL Editor → New query и нажмите Run.

-- Все данные приложения (месяцы, строки, колонки, ячейки, долги, участники, настройки).
create table if not exists public.items (
  id          text primary key,
  kind        text not null,
  month       text,
  data        jsonb not null default '{}'::jsonb,
  deleted     boolean not null default false,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

-- История изменений: каждое сохранение записывается сюда автоматически.
create table if not exists public.history (
  id           bigserial primary key,
  item_id      text not null,
  kind         text,
  month        text,
  old_data     jsonb,
  new_data     jsonb,
  old_deleted  boolean,
  new_deleted  boolean,
  changed_by   text,
  changed_at   timestamptz not null default now()
);

create or replace function public.items_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and old.data = new.data and old.deleted = new.deleted then
    return new;
  end if;
  insert into public.history (item_id, kind, month, old_data, new_data, old_deleted, new_deleted, changed_by)
  values (
    new.id, new.kind, new.month,
    case when tg_op = 'UPDATE' then old.data end, new.data,
    case when tg_op = 'UPDATE' then old.deleted end, new.deleted,
    new.updated_by
  );
  return new;
end $$;

drop trigger if exists items_log on public.items;
create trigger items_log before insert or update on public.items
  for each row execute function public.items_log();

-- Доступ: приложение семейное, вход по имени и PIN внутри приложения.
alter table public.items enable row level security;
alter table public.history enable row level security;

drop policy if exists "family items" on public.items;
create policy "family items" on public.items
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "family history read" on public.history;
create policy "family history read" on public.history
  for select to anon, authenticated using (true);

grant select, insert, update on public.items to anon, authenticated;
grant select on public.history to anon, authenticated;

-- Изменения видны всем сразу (реальное время).
do $$
begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null;
end $$;

-- Квитанции (фото и PDF): закрытое хранилище, доступ по ссылке из приложения.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "family receipts read" on storage.objects;
create policy "family receipts read" on storage.objects for select to anon, authenticated using (bucket_id = 'receipts');
drop policy if exists "family receipts upload" on storage.objects;
create policy "family receipts upload" on storage.objects for insert to anon, authenticated with check (bucket_id = 'receipts');
drop policy if exists "family receipts delete" on storage.objects;
create policy "family receipts delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'receipts');
