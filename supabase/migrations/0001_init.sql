-- APEX F1 initial schema
-- Public motorsport data is readable by anyone; writes are service-role only.
-- User data (profiles, favorites, preferences, reminders) is protected by RLS.

create extension if not exists "pgcrypto";

-- ============ Public motorsport data ============

create table if not exists public.seasons (
  year int primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.circuits (
  circuit_key int primary key,
  short_name text not null,
  name text,
  type text,
  location text,
  country_key int,
  country_code text,
  country_name text,
  country_flag_url text,
  image_url text,
  info_url text,
  gmt_offset text,
  lat double precision,
  long double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetings (
  meeting_key int primary key,
  year int not null references public.seasons(year),
  circuit_key int references public.circuits(circuit_key),
  name text not null,
  official_name text,
  location text,
  country_name text,
  country_code text,
  date_start timestamptz,
  date_end timestamptz,
  gmt_offset text,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists meetings_year_idx on public.meetings(year);

create table if not exists public.sessions (
  session_key int primary key,
  meeting_key int not null references public.meetings(meeting_key),
  name text not null,
  type text not null,
  date_start timestamptz,
  date_end timestamptz,
  gmt_offset text,
  circuit_key int,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sessions_meeting_idx on public.sessions(meeting_key);
create index if not exists sessions_start_idx on public.sessions(date_start);

create table if not exists public.teams (
  id text primary key,            -- constructorId (jolpica) or provider name slug
  name text not null,
  nationality text,
  colour text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id text primary key,            -- driverId (jolpica) when known
  driver_number int,
  code text,
  first_name text,
  last_name text,
  full_name text,
  acronym text,
  broadcast_name text,
  nationality text,
  date_of_birth date,
  headshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drivers_number_idx on public.drivers(driver_number);

create table if not exists public.driver_team_seasons (
  year int not null references public.seasons(year),
  driver_id text not null references public.drivers(id),
  team_id text not null references public.teams(id),
  primary key (year, driver_id, team_id)
);

create table if not exists public.session_results (
  session_key int not null references public.sessions(session_key),
  driver_id text not null references public.drivers(id),
  position int,
  position_text text,
  points numeric,
  grid int,
  laps int,
  status text,
  time text,
  fastest_lap boolean,
  provisional boolean not null default true,
  primary key (session_key, driver_id)
);
create index if not exists session_results_driver_idx on public.session_results(driver_id);

create table if not exists public.championship_standings (
  year int not null references public.seasons(year),
  kind text not null check (kind in ('driver','constructor')),
  entity_id text not null,
  position int not null,
  points numeric not null,
  wins int not null default 0,
  as_of_round int,
  updated_at timestamptz not null default now(),
  primary key (year, kind, entity_id)
);

create table if not exists public.laps (
  session_key int not null references public.sessions(session_key),
  driver_number int not null,
  lap_number int not null,
  date_start timestamptz,
  lap_duration double precision,
  sector1 double precision,
  sector2 double precision,
  sector3 double precision,
  i1_speed int,
  i2_speed int,
  st_speed int,
  is_pit_out_lap boolean,
  primary key (session_key, driver_number, lap_number)
);
create index if not exists laps_session_lap_idx on public.laps(session_key, lap_number);

create table if not exists public.sector_times (
  session_key int not null,
  driver_number int not null,
  lap_number int not null,
  sector int not null,
  duration double precision,
  segments jsonb,
  primary key (session_key, driver_number, lap_number, sector),
  foreign key (session_key, driver_number, lap_number)
    references public.laps(session_key, driver_number, lap_number) on delete cascade
);

create table if not exists public.tyre_stints (
  session_key int not null references public.sessions(session_key),
  driver_number int not null,
  stint_number int not null,
  lap_start int not null,
  lap_end int not null,
  compound text,
  tyre_age_at_start int,
  primary key (session_key, driver_number, stint_number)
);

create table if not exists public.pit_stops (
  session_key int not null references public.sessions(session_key),
  driver_number int not null,
  date timestamptz not null,
  lap_number int,
  pit_duration double precision,
  primary key (session_key, driver_number, date)
);

-- High-frequency tables: batch inserts only from trusted ingestion jobs,
-- with retention handled by scheduled cleanup (see data_sync_runs / docs).
create table if not exists public.telemetry_samples (
  session_key int not null,
  driver_number int not null,
  date timestamptz not null,
  speed int,
  rpm int,
  gear int,
  throttle int,
  brake int,
  drs int,
  primary key (session_key, driver_number, date)
);
create index if not exists telemetry_session_driver_idx
  on public.telemetry_samples(session_key, driver_number, date);

create table if not exists public.driver_positions (
  session_key int not null,
  driver_number int not null,
  date timestamptz not null,
  position int not null,
  primary key (session_key, driver_number, date)
);

create table if not exists public.weather_observations (
  session_key int not null,
  date timestamptz not null,
  air_temperature double precision,
  track_temperature double precision,
  humidity double precision,
  pressure double precision,
  wind_speed double precision,
  wind_direction int,
  rainfall int,
  primary key (session_key, date)
);

create table if not exists public.race_control_messages (
  id uuid primary key default gen_random_uuid(),
  session_key int not null,
  date timestamptz not null,
  category text,
  flag text,
  scope text,
  sector int,
  lap_number int,
  driver_number int,
  message text not null,
  unique (session_key, date, message)
);
create index if not exists rc_session_date_idx on public.race_control_messages(session_key, date);

create table if not exists public.data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  status text not null check (status in ('ok','error','partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  detail jsonb
);

-- ============ User data ============

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_kind text not null check (entity_kind in ('driver','team','circuit')),
  entity_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_kind, entity_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Jakarta',
  theme text not null default 'dark',
  timing_columns jsonb not null default '[]'::jsonb,
  telemetry_channels jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.session_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key int not null,
  minutes_before int not null default 30,
  created_at timestamptz not null default now(),
  primary key (user_id, session_key)
);

-- ============ RLS ============

alter table public.seasons enable row level security;
alter table public.circuits enable row level security;
alter table public.meetings enable row level security;
alter table public.sessions enable row level security;
alter table public.teams enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_team_seasons enable row level security;
alter table public.session_results enable row level security;
alter table public.championship_standings enable row level security;
alter table public.laps enable row level security;
alter table public.sector_times enable row level security;
alter table public.tyre_stints enable row level security;
alter table public.pit_stops enable row level security;
alter table public.telemetry_samples enable row level security;
alter table public.driver_positions enable row level security;
alter table public.weather_observations enable row level security;
alter table public.race_control_messages enable row level security;
alter table public.data_sync_runs enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.session_reminders enable row level security;

-- Public read for motorsport reference data. No public write policies:
-- only the service role (bypasses RLS) may write, from server ingestion jobs.
do $$
declare t text;
begin
  foreach t in array array[
    'seasons','circuits','meetings','sessions','teams','drivers',
    'driver_team_seasons','session_results','championship_standings','laps',
    'sector_times','tyre_stints','pit_stops','telemetry_samples',
    'driver_positions','weather_observations','race_control_messages']
  loop
    execute format('create policy %I on public.%I for select using (true)', t || '_public_read', t);
  end loop;
end $$;

-- data_sync_runs: service role only (no policies for anon/auth).

create policy profiles_own on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy favorites_own on public.user_favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy preferences_own on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reminders_own on public.session_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
