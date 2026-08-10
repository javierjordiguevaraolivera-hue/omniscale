-- ============================================================
-- 0003_refresh_interval_windsor · PENDIENTE
--
-- Agrega `refresh_interval` a las conexiones de Windsor.
--
-- Por qué: el endpoint de Windsor acepta `refresh_interval`, que define cada
-- cuánto vuelve a pedirle los datos a la plataforma de origen (TikTok). Su
-- valor por defecto es 6h, y de ahí venía el desfase de gasto: consultábamos
-- cada 2 minutos pero Windsor servía su copia cacheada.
--
-- Ojo: el plan TRIAL / Free / Basic NO acepta este parámetro (la API responde
-- "Hourly data is not available for TRIAL subscription plan"). Por eso el
-- valor por defecto es NULL = no se manda, y así sigue funcionando en TRIAL.
-- Al pasar a Standard o superior se pone 1h; en Professional, 15min.
-- ============================================================

alter table connections add column if not exists refresh_interval text;

comment on column connections.refresh_interval is
  'Solo Windsor. null = no enviar el parametro (obligatorio en TRIAL/Free/Basic). Standard/Plus: 1h o mas. Professional/Enterprise: 15min o mas.';

insert into omni_migraciones (version, nombre, nota) values
  ('0003', 'refresh_interval_windsor', 'Columna connections.refresh_interval para controlar cada cuanto Windsor re-consulta a la plataforma de origen. null en planes TRIAL/Free/Basic.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
