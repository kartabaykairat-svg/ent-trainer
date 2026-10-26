-- «Мой день»: выполните целиком в Supabase → SQL Editor.
-- Одна универсальная таблица: задачи, привычки, тренировки, здоровье, поездки (kind + data jsonb).
create table if not exists public.entries (
  id         text        not null,
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text        not null check (kind in ('task','habit','workout','health','trip')),
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists entries_user_updated on public.entries (user_id, updated_at);

alter table public.entries enable row level security;

create policy "entries_select_own" on public.entries for select using (auth.uid() = user_id);
create policy "entries_insert_own" on public.entries for insert with check (auth.uid() = user_id);
create policy "entries_update_own" on public.entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "entries_delete_own" on public.entries for delete using (auth.uid() = user_id);
