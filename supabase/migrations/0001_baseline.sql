-- ============================================================
-- 0001_baseline · YA EJECUTADA
--
-- NO la ejecutes de nuevo. Queda aquí como punto de partida: es el esquema
-- completo con el que arrancó la base. Solo se corre en una base nueva y
-- vacía, y después las demás migraciones en orden.
--
-- Todo cambio posterior va en un archivo NUEVO de esta carpeta.
-- Ver supabase/README.md.
-- ============================================================

-- Tablas de la primera versión (gasto vía tokens de Facebook). Ahora el gasto
-- entra por Windsor.ai con plataforma + cuenta + campaña, así que sobran.
drop table if exists snap_account cascade;
drop table if exists ad_accounts cascade;

-- Configuración global (una sola fila, id = 1)
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'America/New_York',
  everflow_timezone_id int not null default 67, -- 67 = America/New_York en Everflow
  retention_days int not null default 3,        -- días que se conservan los snapshots intradía
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- Credenciales: Everflow (revenue), tokens de Facebook (gasto por cuenta) y
-- Windsor.ai (gasto por campaña de las plataformas que indique `scope`).
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null default '',
  api_key text not null,
  -- Solo para Windsor: plataformas que aporta, separadas por coma
  -- (por defecto 'tiktok,google'; '*' = todas). Evita duplicar el gasto de
  -- Facebook, que entra por su propio token.
  scope text,
  active boolean not null default true,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

alter table connections add column if not exists scope text;

alter table connections drop constraint if exists connections_platform_check;
alter table connections
  add constraint connections_platform_check
  check (platform in ('everflow', 'facebook', 'windsor'));

-- Catálogo de ofertas (se puebla solo desde Everflow)
create table if not exists offers (
  offer_id int primary key,
  name text not null default '',
  updated_at timestamptz not null default now()
);

-- Mapeo plataforma × cuenta × campaña → oferta. `campaign` vacío = regla a
-- nivel de cuenta. offer_id null = pendiente de configurar.
create table if not exists spend_map (
  datasource text not null,
  account_name text not null,
  campaign text not null default '',
  offer_id int,
  auto_mapped boolean not null default false,
  origen text not null default 'sin-configurar',
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (datasource, account_name, campaign)
);

-- Snapshot intradía: conversiones/revenue por oferta × source (Everflow)
create table if not exists snap_offer_source (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null,
  day date not null,
  offer_id int not null,
  offer_name text not null default '',
  source_id text not null default 'unknown',
  clicks numeric not null default 0,
  unique_clicks numeric not null default 0,
  conversions numeric not null default 0,
  revenue numeric not null default 0
);
create index if not exists idx_sos_day_captured on snap_offer_source (day, captured_at);

-- Snapshot intradía: gasto por plataforma × cuenta × campaña (Windsor).
-- offer_id queda CONGELADO al momento de la captura (efecto screenshot).
create table if not exists snap_spend (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null,
  day date not null,
  datasource text not null,
  account_name text not null default '',
  campaign text not null default '',
  clicks numeric not null default 0,
  spend numeric not null default 0,
  offer_id int
);
create index if not exists idx_ss_day_captured on snap_spend (day, captured_at);

-- Bitácora de cada corrida de ingesta: qué pidió, qué llegó, qué se descartó y
-- por qué. Es lo que se ve en la pantalla /logs.
create table if not exists ingest_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  day date,
  origen text not null default 'cron',   -- cron | manual
  ok boolean not null default false,
  everflow_rows int not null default 0,
  spend_rows int not null default 0,
  descartadas int not null default 0,
  sin_asignar int not null default 0,
  detalle jsonb not null default '[]'::jsonb,
  errores jsonb not null default '[]'::jsonb
);
create index if not exists idx_runs_started on ingest_runs (started_at desc);

-- Resumen histórico: una fila por día x oferta. offer_id = 0 agrupa el gasto sin oferta asignada.
create table if not exists daily_summary (
  day date not null,
  offer_id int not null,
  offer_name text not null default '',
  spend numeric not null default 0,
  conversions numeric not null default 0,
  revenue numeric not null default 0,
  profit numeric not null default 0,
  created_at timestamptz not null default now(),
  primary key (day, offer_id)
);

-- ============================================================
-- Funciones de lectura para el dashboard
-- ============================================================

-- Serie intradía agregada por captura (para los dos gráficos lineales)
create or replace function intraday_series(p_day date, p_offer int default null)
returns table (captured_at timestamptz, spend numeric, conversions numeric, revenue numeric)
language sql stable as $$
  with s as (
    select ss.captured_at, sum(ss.spend) as spend
    from snap_spend ss
    where ss.day = p_day and (p_offer is null or ss.offer_id = p_offer)
    group by ss.captured_at
  ),
  c as (
    select so.captured_at, sum(so.conversions) as conversions, sum(so.revenue) as revenue
    from snap_offer_source so
    where so.day = p_day and (p_offer is null or so.offer_id = p_offer)
    group by so.captured_at
  )
  select
    coalesce(s.captured_at, c.captured_at) as captured_at,
    coalesce(s.spend, 0) as spend,
    coalesce(c.conversions, 0) as conversions,
    coalesce(c.revenue, 0) as revenue
  from s
  full outer join c on s.captured_at = c.captured_at
  order by 1;
$$;

-- Última captura del día: filas oferta x source (Everflow)
create or replace function latest_offer_source(p_day date)
returns setof snap_offer_source
language sql stable as $$
  select * from snap_offer_source
  where day = p_day
    and captured_at = (select max(captured_at) from snap_offer_source where day = p_day)
  order by revenue desc;
$$;

-- Última captura del día: filas de gasto (plataforma x cuenta x campaña)
create or replace function latest_spend(p_day date)
returns setof snap_spend
language sql stable as $$
  select * from snap_spend
  where day = p_day
    and captured_at = (select max(captured_at) from snap_spend where day = p_day)
  order by spend desc;
$$;

-- ============================================================
-- Seguridad (RLS): lectura solo para usuarios autenticados.
-- Las escrituras las hace únicamente el servidor con la service role key.
-- ============================================================

alter table settings enable row level security;
alter table connections enable row level security;
alter table offers enable row level security;
alter table spend_map enable row level security;
alter table snap_offer_source enable row level security;
alter table snap_spend enable row level security;
alter table daily_summary enable row level security;
alter table ingest_runs enable row level security;

drop policy if exists "auth read settings" on settings;
create policy "auth read settings" on settings for select to authenticated using (true);

drop policy if exists "auth read connections" on connections;
create policy "auth read connections" on connections for select to authenticated using (true);

drop policy if exists "auth read offers" on offers;
create policy "auth read offers" on offers for select to authenticated using (true);

drop policy if exists "auth read spend_map" on spend_map;
create policy "auth read spend_map" on spend_map for select to authenticated using (true);

drop policy if exists "auth read snap_offer_source" on snap_offer_source;
create policy "auth read snap_offer_source" on snap_offer_source for select to authenticated using (true);

drop policy if exists "auth read snap_spend" on snap_spend;
create policy "auth read snap_spend" on snap_spend for select to authenticated using (true);

drop policy if exists "auth read daily_summary" on daily_summary;
create policy "auth read daily_summary" on daily_summary for select to authenticated using (true);

drop policy if exists "auth read ingest_runs" on ingest_runs;
create policy "auth read ingest_runs" on ingest_runs for select to authenticated using (true);

-- Permite que el rol de la API llame a las funciones de lectura.
grant execute on function intraday_series(date, int) to authenticated, service_role;
grant execute on function latest_offer_source(date) to authenticated, service_role;
grant execute on function latest_spend(date) to authenticated, service_role;

-- Refresca la caché de PostgREST para que lo nuevo se vea al instante.
notify pgrst, 'reload schema';
