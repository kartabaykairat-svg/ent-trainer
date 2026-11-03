-- Менеджер паролей: таблицы и правила доступа для Supabase.
-- Скопируйте весь файл в Supabase → SQL Editor → New query и нажмите Run.
-- Скрипт можно запускать повторно.
--
-- Сервер хранит только шифртекст (AES-256-GCM). Мастер-пароль и ключ
-- никогда не покидают браузер. Row Level Security гарантирует, что каждый
-- пользователь видит только свои строки. Если у пользователя включена
-- 2FA (TOTP), доступ к данным открывается только после ввода кода (aal2).

-- ---------- Проверка уровня аутентификации (2FA) ----------
create or replace function public.pm_aal_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;
revoke all on function public.pm_aal_ok() from public, anon;
grant execute on function public.pm_aal_ok() to authenticated;

-- ---------- Хранилище: соль PBKDF2, проверочный шифртекст, мета ----------
create table if not exists public.pm_vaults (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  kdf_salt        text not null,
  kdf_iterations  integer not null check (kdf_iterations >= 600000),
  verifier        text not null,
  meta            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- Записи: всё содержимое зашифровано одним блоком ----------
create table if not exists public.pm_entries (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  data        text not null check (data like 'v1:%' and length(data) < 200000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists pm_entries_user_idx on public.pm_entries (user_id);

-- ---------- Журнал входов ----------
create table if not exists public.pm_login_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  device      text not null default '',
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists pm_login_events_user_idx on public.pm_login_events (user_id, created_at desc);

-- ---------- updated_at ----------
create or replace function public.pm_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists pm_vaults_touch on public.pm_vaults;
create trigger pm_vaults_touch before update on public.pm_vaults
  for each row execute function public.pm_touch();
drop trigger if exists pm_entries_touch on public.pm_entries;
create trigger pm_entries_touch before update on public.pm_entries
  for each row execute function public.pm_touch();

-- ---------- Row Level Security ----------
alter table public.pm_vaults       enable row level security;
alter table public.pm_entries      enable row level security;
alter table public.pm_login_events enable row level security;

revoke all on public.pm_vaults, public.pm_entries, public.pm_login_events from anon;
grant select, insert, update, delete on public.pm_vaults, public.pm_entries to authenticated;
grant select on public.pm_login_events to authenticated;

drop policy if exists pm_vaults_own on public.pm_vaults;
create policy pm_vaults_own on public.pm_vaults
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.pm_aal_ok()))
  with check (user_id = (select auth.uid()) and (select public.pm_aal_ok()));

drop policy if exists pm_entries_own on public.pm_entries;
create policy pm_entries_own on public.pm_entries
  for all to authenticated
  using (user_id = (select auth.uid()) and (select public.pm_aal_ok()))
  with check (user_id = (select auth.uid()) and (select public.pm_aal_ok()));

drop policy if exists pm_login_events_read on public.pm_login_events;
create policy pm_login_events_read on public.pm_login_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- Запись входа (IP берётся из заголовков запроса) ----------
create or replace function public.pm_log_login(p_device text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  begin
    v_ip := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
  exception when others then
    v_ip := null;
  end;
  insert into public.pm_login_events (user_id, device, ip)
  values (auth.uid(), left(coalesce(p_device, ''), 200), nullif(trim(v_ip), ''));
  -- храним последние 100 входов
  delete from public.pm_login_events
  where user_id = auth.uid()
    and id not in (
      select id from public.pm_login_events where user_id = auth.uid()
      order by created_at desc limit 100
    );
end $$;
revoke all on function public.pm_log_login(text) from public, anon;
grant execute on function public.pm_log_login(text) to authenticated;

-- ---------- Смена мастер-пароля: всё перешифровывается одной транзакцией ----------
create or replace function public.pm_rotate_vault(
  p_salt text, p_iterations integer, p_verifier text, p_meta text, p_entries jsonb
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_updated integer;
  v_total integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.pm_vaults
     set kdf_salt = p_salt, kdf_iterations = p_iterations, verifier = p_verifier, meta = p_meta
   where user_id = auth.uid();
  if not found then
    raise exception 'vault not found';
  end if;

  -- updated_at сверяется: если запись изменили на другом устройстве после
  -- того, как клиент её прочитал, строка не обновится и вся транзакция откатится.
  update public.pm_entries e
     set data = x.data
    from jsonb_to_recordset(p_entries) as x(id uuid, data text, updated_at timestamptz)
   where e.id = x.id and e.user_id = auth.uid() and e.updated_at = x.updated_at;
  get diagnostics v_updated = row_count;

  select count(*) into v_total from public.pm_entries where user_id = auth.uid();
  if v_updated <> v_total or v_total <> jsonb_array_length(p_entries) then
    raise exception 'entries changed during rotation';
  end if;
end $$;
revoke all on function public.pm_rotate_vault(text, integer, text, text, jsonb) from public, anon;
grant execute on function public.pm_rotate_vault(text, integer, text, text, jsonb) to authenticated;

-- ---------- Удаление аккаунта со всеми данными ----------
create or replace function public.pm_delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.pm_aal_ok() then
    raise exception 'aal2 required';
  end if;
  delete from public.pm_entries where user_id = auth.uid();
  delete from public.pm_vaults where user_id = auth.uid();
  delete from public.pm_login_events where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.pm_delete_account() from public, anon;
grant execute on function public.pm_delete_account() to authenticated;
