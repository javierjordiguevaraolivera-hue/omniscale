-- ============================================================
-- 0007_mapeo_por_id_ofertas_y_gastos · PENDIENTE
--
-- Cuatro cosas, todas relacionadas:
--
-- 1. LA CUENTA SE IDENTIFICA POR ID, NO POR NOMBRE.
--    Hasta ahora `spend_map` se llevaba por `account_name`. Si renombrabas una
--    cuenta en Facebook el mapeo se rompía en silencio y su gasto se iba a "sin
--    asignar" sin avisar. Y los nombres llevan la oferta dentro ("L001 - 4069"),
--    así que renombrar es plausible. Además Everflow va a mandar el account id
--    en `sub1`, y sin guardarlo en el gasto no habría con qué cruzarlo.
--    El nombre se conserva y se sigue mostrando: el ID no se memoriza.
--
-- 2. LA OFERTA DE HOY SE RESUELVE AL LEER, no al capturar.
--    Antes `snap_spend.offer_id` quedaba congelado en cada captura, así que
--    cambiar el mapeo al mediodía dejaba la mañana con la oferta vieja y la
--    tarde con la nueva: el día salía partido. Ahora el gasto del día vigente
--    resuelve su oferta contra `spend_map` en el momento de leer, así que un
--    cambio cuenta para TODO el día al instante. La columna `offer_id` de las
--    capturas se queda como rastro de auditoría.
--    El histórico no cambia: se congela una sola vez, al consolidar.
--
-- 3. OFERTAS: tipo de conversión y activa. El payout NO se guarda, viene de
--    Everflow.
--
-- 4. GASTOS FIJOS (los que no son de ads: suscripciones, herramientas,
--    contabilidad). Se descuentan del resultado MENSUAL, nunca del día.
--
-- No borra ninguna tabla ni ninguna columna con datos.
-- ============================================================


-- ============================================================
-- 1) Ofertas: tipo de conversión y activa
-- ============================================================

alter table offers add column if not exists conversion_type text;
alter table offers add column if not exists active boolean not null default true;

comment on column offers.conversion_type is
  'Que se paga: lead | llamada | registro | otro. Lo configura el usuario; Everflow no lo dice.';
comment on column offers.active is
  'false = oferta que ya no se corre. Solo esconde; nunca borra historico.';

alter table offers drop constraint if exists offers_conversion_type_check;
alter table offers add constraint offers_conversion_type_check
  check (conversion_type is null
         or conversion_type in ('lead', 'llamada', 'registro', 'otro'));


-- ============================================================
-- 2) El gasto guarda el account_id
--
-- Facebook y Windsor ya lo devuelven los dos; solo se estaba tirando.
-- ============================================================

alter table snap_spend add column if not exists account_id text not null default '';
alter table spend_map  add column if not exists account_id text not null default '';

comment on column spend_map.account_id is
  'Identificador estable de la cuenta. Si la plataforma no da uno, se usa el nombre.';

-- Rellenar el ID de lo que ya está guardado. Facebook sale del catálogo de
-- cuentas descubiertas, cruzando por nombre (que es lo único que hay).
update spend_map sm
   set account_id = a.account_id
  from fb_ad_accounts a
 where sm.account_id = ''
   and sm.datasource = 'facebook'
   and a.account_name = sm.account_name;

update snap_spend ss
   set account_id = a.account_id
  from fb_ad_accounts a
 where ss.account_id = ''
   and ss.datasource = 'facebook'
   and a.account_name = ss.account_name;

-- Lo que quede sin ID (capturas viejas de Windsor, Zernio) usa el nombre como
-- identificador. Así ningún mapeo hecho a mano se pierde en el cambio de llave.
update spend_map  set account_id = account_name where account_id = '';
update snap_spend set account_id = account_name where account_id = '';

-- Si dos nombres distintos resolvieron al MISMO id + campaña, la llave nueva no
-- se podría crear. Se conserva una sola fila: la manual manda, y entre iguales
-- la más reciente.
delete from spend_map
 where ctid in (
   select ctid from (
     select ctid,
            row_number() over (
              partition by datasource, account_id, campaign
              order by (origen = 'manual') desc, updated_at desc
            ) as rn
       from spend_map
   ) d
   where d.rn > 1
 );

-- La llave vieja se suelta buscando su nombre real, no asumiéndolo: si el
-- nombre no fuera `spend_map_pkey`, un `drop constraint if exists` no haría nada
-- y el `add primary key` de abajo reventaría con "multiple primary keys".
do $$
declare
  llave text;
begin
  select conname into llave
    from pg_constraint
   where conrelid = 'spend_map'::regclass
     and contype = 'p';
  if llave is not null then
    execute format('alter table spend_map drop constraint %I', llave);
  end if;
end $$;

alter table spend_map add primary key (datasource, account_id, campaign);

create index if not exists idx_spend_map_nombre on spend_map (datasource, account_name);
create index if not exists idx_ss_day_cuenta on snap_spend (day, datasource, account_id);


-- ============================================================
-- 3) Everflow: sub1 (el account id) y la plataforma normalizada
--
-- `source_id` va a traer la plataforma con el nombre de Everflow ("Facebook
-- Ads", "YouTube Ads"...). `platform` guarda la versión normalizada que usa la
-- app. `sub1` se guarda crudo para poder ver qué está llegando de verdad
-- mientras se hace la transición, y `account_id` solo se llena cuando `sub1` es
-- un ID de verdad: puros dígitos. Un nombre de campaña viejo se ignora.
-- ============================================================

alter table snap_offer_source add column if not exists sub1 text not null default '';
alter table snap_offer_source add column if not exists platform text not null default '';
alter table snap_offer_source add column if not exists account_id text;

comment on column snap_offer_source.sub1 is
  'Valor crudo de sub1 tal como lo manda Everflow.';
comment on column snap_offer_source.platform is
  'source_id normalizado: facebook | tiktok | google | youtube | taboola. Vacio = huerfano.';
comment on column snap_offer_source.account_id is
  'sub1 validado como ID (solo digitos). null = sub1 no era un ID, no se puede repartir por cuenta.';

create index if not exists idx_sos_cuenta on snap_offer_source (day, account_id);


-- ============================================================
-- 4) Gastos fijos (lo que no es ads)
--
-- Cómo funciona el apagado, que es lo que más se confunde: en SaaS lo normal es
-- cancelar al final del periodo. Cancelas y NO te vuelven a cobrar, pero sigues
-- usándolo hasta que se acaba el mes ya pagado. Por eso al apagar se pide
-- `pagado_hasta`: con eso el estado (ya cobrado / por cobrar / vigente sin más
-- cobros / terminado) se deduce solo, sin llevar contabilidad a mano.
-- ============================================================

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                        -- la plataforma: OpenAI, Windsor...
  motivo text not null default '',              -- para qué se usa
  categoria text not null default 'herramientas',
  monto numeric not null default 0,             -- SIEMPRE en USD
  tipo text not null default 'suscripcion',     -- suscripcion | unico
  dia_cobro int,                                -- 1..31; solo suscripción
  inicio date not null default current_date,
  activo boolean not null default true,
  pagado_hasta date,                            -- se llena al apagar
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gastos_tipo_check check (tipo in ('suscripcion', 'unico')),
  constraint gastos_dia_check check (dia_cobro is null or dia_cobro between 1 and 31),
  -- Una suscripción sin día de cobro no se puede calendarizar.
  constraint gastos_suscripcion_con_dia check (tipo <> 'suscripcion' or dia_cobro is not null),
  constraint gastos_monto_check check (monto >= 0)
);

comment on table gastos is
  'Gastos que NO son de ads. Se descuentan del resultado MENSUAL (profit neto), nunca del dia.';
comment on column gastos.monto is 'Siempre USD.';
comment on column gastos.dia_cobro is
  'Dia del mes en que cobra. Si el mes no tiene ese dia (31 en febrero), se ajusta al ultimo.';
comment on column gastos.pagado_hasta is
  'Ultimo dia cubierto por lo ya pagado. Se pide al apagar: despues de esa fecha no hay mas cobros.';

create index if not exists idx_gastos_activo on gastos (activo, inicio);


-- ============================================================
-- 5) Lecturas: la oferta del día vigente se resuelve viva
-- ============================================================

-- El gasto resuelve su oferta contra `spend_map` (mapeo vigente) y solo cae en
-- el `offer_id` congelado de la captura si esa combinación ya no está mapeada.
-- El revenue NO se toca: la oferta de Everflow es la verdad y nunca dependió
-- del mapeo, que solo dirige el gasto.
create or replace function intraday_series(p_day date, p_offer int default null)
returns table (captured_at timestamptz, spend numeric, conversions numeric, revenue numeric)
language sql stable as $$
  with capturas as (
    select so.captured_at from snap_offer_source so where so.day = p_day
    union
    select ss.captured_at from snap_spend ss where ss.day = p_day
  ),
  gasto as (
    select ss.captured_at, sum(ss.spend) as spend
    from snap_spend ss
    left join spend_map sm
      on sm.datasource = ss.datasource
     and sm.account_id = ss.account_id
     and sm.campaign   = ss.campaign
    where ss.day = p_day
      and (p_offer is null or coalesce(sm.offer_id, ss.offer_id) = p_offer)
    group by ss.captured_at
  ),
  conv as (
    select so.captured_at,
           sum(so.conversions) as conversions,
           sum(so.revenue) as revenue
    from snap_offer_source so
    where so.day = p_day and (p_offer is null or so.offer_id = p_offer)
    group by so.captured_at
  ),
  unido as (
    select cap.captured_at, g.spend, c.conversions, c.revenue
    from capturas cap
    left join gasto g on g.captured_at = cap.captured_at
    left join conv  c on c.captured_at = cap.captured_at
  ),
  -- Truco de "islas": cada valor no nulo abre un grupo, y dentro del grupo se
  -- propaga hacia adelante. Postgres no tiene LAST_VALUE ... IGNORE NULLS.
  marcado as (
    select u.*,
           count(u.spend)   over (order by u.captured_at) as isla_gasto,
           count(u.revenue) over (order by u.captured_at) as isla_conv
    from unido u
  )
  select
    m.captured_at,
    coalesce(max(m.spend)       over (partition by m.isla_gasto), 0) as spend,
    coalesce(max(m.conversions) over (partition by m.isla_conv),  0) as conversions,
    coalesce(max(m.revenue)     over (partition by m.isla_conv),  0) as revenue
  from marcado m
  order by m.captured_at;
$$;

grant execute on function intraday_series(date, int) to authenticated, service_role;

-- Cambia el tipo de retorno (antes `setof snap_spend`), así que hay que soltarla
-- antes de recrearla.
drop function if exists latest_spend(date);
create or replace function latest_spend(p_day date)
returns table (
  captured_at timestamptz,
  day date,
  datasource text,
  account_id text,
  account_name text,
  campaign text,
  clicks numeric,
  spend numeric,
  offer_id int,
  -- De dónde salió la oferta: 'vivo' = del mapeo actual, 'captura' = del
  -- congelado porque esa combinación ya no está en el mapeo.
  origen_oferta text
)
language sql stable as $$
  select
    ss.captured_at,
    ss.day,
    ss.datasource,
    ss.account_id,
    ss.account_name,
    ss.campaign,
    ss.clicks,
    ss.spend,
    coalesce(sm.offer_id, ss.offer_id) as offer_id,
    case when sm.offer_id is not null then 'vivo' else 'captura' end as origen_oferta
  from snap_spend ss
  left join spend_map sm
    on sm.datasource = ss.datasource
   and sm.account_id = ss.account_id
   and sm.campaign   = ss.campaign
  where ss.day = p_day
    and ss.captured_at = (select max(captured_at) from snap_spend where day = p_day)
  order by ss.spend desc;
$$;

grant execute on function latest_spend(date) to authenticated, service_role;


-- ============================================================
-- 6) Seguridad
-- ============================================================

alter table gastos enable row level security;

drop policy if exists "auth read gastos" on gastos;
create policy "auth read gastos" on gastos
  for select to authenticated using (true);


insert into omni_migraciones (version, nombre, nota) values
  ('0007', 'mapeo_por_id_ofertas_y_gastos', 'spend_map pasa a llevarse por account_id (el nombre se conserva para mostrar): renombrar una cuenta ya no rompe el mapeo, y permite cruzar el sub1 de Everflow. La oferta del dia vigente se resuelve al leer contra spend_map, asi un cambio a mediodia cuenta para todo el dia. offers gana conversion_type y active. snap_offer_source gana sub1, platform y account_id. Nueva tabla gastos (no-ads) que se descuenta del resultado mensual.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
