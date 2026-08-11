-- ============================================================
-- 0006_facebook_propio_y_exclusiones · Ejecutado
--
-- Facebook deja de venir por Windsor y pasa a lógica propia, replicando el
-- flujo de n8n que ya funciona:
--   1. Con el token de un VM/BM, listar sus cuentas publicitarias.
--   2. Pedir el gasto del día de cada cuenta (insights, level=account).
--   3. Descartar las que no gastaron.
--
-- Dos cosas nuevas:
--   * `connections.business_id`: el ID del Business Manager del VM. Si se deja
--     vacío se usan todas las cuentas que el token pueda ver.
--   * tabla `fb_ad_accounts`: el catálogo de cuentas descubiertas por VM, con
--     un `excluida` que se revisa EN CADA MEDICIÓN. Así se puede excluir o
--     volver a incluir una cuenta cuando sea, y aplica desde la corrida
--     siguiente sin tocar el histórico ya guardado.
-- ============================================================

alter table connections add column if not exists business_id text;

comment on column connections.business_id is
  'Solo Facebook: ID del Business Manager del VM. Vacio = usar todas las cuentas que vea el token.';

create table if not exists fb_ad_accounts (
  connection_id uuid not null references connections(id) on delete cascade,
  account_id text not null,              -- "1100308604610890" (sin el prefijo act_)
  account_name text not null default '',
  currency text,
  timezone_name text,
  account_status int,
  -- Se consulta en cada corrida: excluir o volver a incluir aplica de inmediato.
  excluida boolean not null default false,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (connection_id, account_id)
);

create index if not exists idx_fbacc_conn on fb_ad_accounts (connection_id);

alter table fb_ad_accounts enable row level security;

drop policy if exists "auth read fb_ad_accounts" on fb_ad_accounts;
create policy "auth read fb_ad_accounts" on fb_ad_accounts
  for select to authenticated using (true);

-- Windsor ya no debe traer Facebook: si lo trajera, se contaría doble con la
-- lógica propia. Se limpia el scope de las conexiones existentes.
update connections
   set scope = 'tiktok,google'
 where platform = 'windsor'
   and (scope is null or scope = '' or scope ilike '%facebook%' or scope = '*');

insert into omni_migraciones (version, nombre, nota) values
  ('0006', 'facebook_propio_y_exclusiones', 'connections.business_id + tabla fb_ad_accounts con `excluida` revisada en cada corrida. Facebook pasa a logica propia (Graph API) y sale del scope de Windsor.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
