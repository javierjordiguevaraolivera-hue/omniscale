-- ============================================================
-- 0005_serie_arrastra_valores · Ejecutado
--
-- Prepara `intraday_series` para que Everflow y el gasto se consulten con
-- FRECUENCIAS DISTINTAS.
--
-- Por qué: medido sobre el historial guardado (2026-08-07 al 10), Windsor
-- actualiza el gasto cada ~6 horas (368 min entre cambios), mientras Everflow
-- refleja cada conversión en minutos. Consultar el gasto cada 2 minutos son 720
-- llamadas al día para ~4 cambios reales.
--
-- Con dos cadencias, habrá capturas que solo traen Everflow y no gasto. Con la
-- versión anterior de esta función esas capturas devolvían spend = 0, y los
-- gráficos habrían mostrado el gasto cayendo a cero y volviendo a subir cada
-- media hora. Aquí se arrastra el ÚLTIMO VALOR CONOCIDO de cada métrica.
-- ============================================================

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
    where ss.day = p_day and (p_offer is null or ss.offer_id = p_offer)
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

insert into omni_migraciones (version, nombre, nota) values
  ('0005', 'serie_arrastra_valores', 'intraday_series arrastra el ultimo valor conocido de gasto y revenue. Necesario porque el gasto (Windsor, ~6h) y Everflow (minutos) se consultan con cadencias distintas y habria capturas sin gasto que se veian como $0.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
