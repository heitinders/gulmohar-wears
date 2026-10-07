-- Find Your Fit: client records, daily try-on counts and the studio staff list.
-- There are deliberately no columns for measurements, height, weight, age or images.
-- Customer writes go through server code with the service role. Studio staff read through RLS.

create table public.fit_clients (
  id               uuid primary key default gen_random_uuid(),
  phone_e164       text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  name             text not null check (char_length(name) between 1 and 80),
  consent_at       timestamptz not null,
  consent_version  text not null,
  style            text check (style in ('punjabi','anarkali','sharara','farshi')),
  fit              text check (fit in ('fitted','regular','relaxed')),
  sleeve           text check (char_length(sleeve) <= 60),
  neckline         text check (char_length(neckline) <= 60),
  length_note      text check (char_length(length_note) <= 200),
  brief            jsonb check (brief is null or (brief - array['occasion','fabric','city','deadline']) = '{}'::jsonb),
  source           text not null default 'fit-app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.fit_usage (
  phone_e164  text not null,              -- a customer phone, or 'staff:<user id>' for studio previews
  day         date not null,
  tryons      int  not null default 0,
  reports     int  not null default 0,    -- "report this preview" count, no content
  primary key (phone_e164, day)
);

create table public.studio_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text not null
);

create function public.fit_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger fit_clients_updated_at before update on public.fit_clients
  for each row execute function public.fit_touch_updated_at();

-- Security definer so policies can ask "is the caller staff?" without reading studio_staff through its own RLS.
create function public.is_studio_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.studio_staff where user_id = auth.uid())
$$;
revoke execute on function public.is_studio_staff() from public, anon;
grant execute on function public.is_studio_staff() to authenticated, service_role;

alter table public.fit_clients enable row level security;
alter table public.fit_usage enable row level security;
alter table public.studio_staff enable row level security;

-- The anon role gets no policies at all. Belt and braces: no grants either.
revoke all on public.fit_clients, public.fit_usage, public.studio_staff from anon;
revoke insert, update, truncate, references, trigger on public.fit_clients from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.fit_usage, public.studio_staff from authenticated;

create policy staff_select_clients on public.fit_clients for select to authenticated using (public.is_studio_staff());
create policy staff_delete_clients on public.fit_clients for delete to authenticated using (public.is_studio_staff());
create policy staff_select_usage on public.fit_usage for select to authenticated using (public.is_studio_staff());
create policy staff_read_own_row on public.studio_staff for select to authenticated using (user_id = auth.uid());

-- Atomic count for try-ons and reports. Server code calls it with the service role only.
create function public.fit_bump_usage(p_key text, p_day date, p_field text) returns int language plpgsql as $$
declare result int;
begin
  if p_field not in ('tryons', 'reports') then raise exception 'unknown usage field %', p_field; end if;
  insert into public.fit_usage (phone_e164, day, tryons, reports)
  values (p_key, p_day, (p_field = 'tryons')::int, (p_field = 'reports')::int)
  on conflict (phone_e164, day) do update set
    tryons  = public.fit_usage.tryons  + (p_field = 'tryons')::int,
    reports = public.fit_usage.reports + (p_field = 'reports')::int
  returning case when p_field = 'tryons' then tryons else reports end into result;
  return result;
end $$;
revoke execute on function public.fit_bump_usage(text, date, text) from public, anon, authenticated;
grant execute on function public.fit_bump_usage(text, date, text) to service_role;
