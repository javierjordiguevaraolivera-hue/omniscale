-- ============================================================
-- OMNI Scale - Esquema de base de datos
-- Ejecutar completo en el SQL Editor del proyecto de Supabase.
-- ============================================================

-- Configuración global (una sola fila, id = 1)
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'America/New_York',
  everflow_timezone_id int not null default 67, -- 67 = America/New_York en Everflow
  retention_days int not null default 3,        -- días que se conservan los snapshots intradía
  updated_at timestamptz not null default now()
);

insert into settings (id) values (1) on conflict (id) do nothing;

-- Credenciales de las plataformas (Everflow API key, tokens de Facebook, etc.)
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('everflow', 'facebook', 'tiktok', 'google')),
  label text not null default '',
  api_key text not null,
  active boolean not null default true,
  last_ok_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

-- Catálogo de ofertas (se puebla solo desde Everflow)
create table if not exists offers (
  offer_id int primary key,
  name text not null default '',
  updated_at timestamptz not null default now()
);

-- Cuentas publicitarias descubiertas en Facebook.
-- offer_id es el mapeo ACTUAL (auto vía "oid_XXXX" en el nombre, o manual).
create table if not exists ad_accounts (
  account_id text primary key,
  name text not null default '',
  connection_id uuid references connections(id) on delete set null,
  offer_id int,
  auto_mapped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Snapshot intradía: conversiones/revenue por oferta x source (Everflow)
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

-- Snapshot intradía: gasto por cuenta publicitaria (Facebook).
-- offer_id queda CONGELADO al momento de la captura (efecto screenshot).
create table if not exists snap_account (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null,
  day date not null,
  account_id text not null,
  account_name text not null default '',
  offer_id int,
  spend numeric not null default 0
);
create index if not exists idx_sa_day_captured on snap_account (day, captured_at);

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
    select sa.captured_at, sum(sa.spend) as spend
    from snap_account sa
    where sa.day = p_day and (p_offer is null or sa.offer_id = p_offer)
    group by sa.captured_at
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

-- Última captura del día: filas oferta x source
create or replace function latest_offer_source(p_day date)
returns setof snap_offer_source
language sql stable as $$
  select * from snap_offer_source
  where day = p_day
    and captured_at = (select max(captured_at) from snap_offer_source where day = p_day)
  order by revenue desc;
$$;

-- Última captura del día: filas por cuenta publicitaria
create or replace function latest_accounts(p_day date)
returns setof snap_account
language sql stable as $$
  select * from snap_account
  where day = p_day
    and captured_at = (select max(captured_at) from snap_account where day = p_day)
  order by spend desc;
$$;

-- ============================================================
-- Seguridad (RLS): lectura solo para usuarios autenticados.
-- Las escrituras las hace únicamente el servidor con la service role key.
-- ============================================================

alter table settings enable row level security;
alter table connections enable row level security;
alter table offers enable row level security;
alter table ad_accounts enable row level security;
alter table snap_offer_source enable row level security;
alter table snap_account enable row level security;
alter table daily_summary enable row level security;

create policy "auth read settings" on settings for select to authenticated using (true);
create policy "auth read connections" on connections for select to authenticated using (true);
create policy "auth read offers" on offers for select to authenticated using (true);
create policy "auth read ad_accounts" on ad_accounts for select to authenticated using (true);
create policy "auth read snap_offer_source" on snap_offer_source for select to authenticated using (true);
create policy "auth read snap_account" on snap_account for select to authenticated using (true);
create policy "auth read daily_summary" on daily_summary for select to authenticated using (true);
