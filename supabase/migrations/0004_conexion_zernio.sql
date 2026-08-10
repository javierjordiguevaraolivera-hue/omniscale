-- ============================================================
-- 0004_conexion_zernio · PENDIENTE
--
-- Habilita 'zernio' como plataforma de conexión.
--
-- Zernio.com expone Meta, TikTok y Google Ads detrás de una sola API key. El
-- OAuth con cada cuenta publicitaria se hace una vez en el panel de Zernio;
-- desde aquí solo se manda la key.
--
-- Reutiliza `scope` igual que Windsor: por defecto 'tiktok,google', porque el
-- gasto de Facebook entra por sus propios tokens y si Zernio también lo trajera
-- se contaría doble.
-- ============================================================

alter table connections drop constraint if exists connections_platform_check;
alter table connections
  add constraint connections_platform_check
  check (platform in ('everflow', 'facebook', 'windsor', 'zernio'));

insert into omni_migraciones (version, nombre, nota) values
  ('0004', 'conexion_zernio', 'Permite platform=zernio en connections. Fuente de gasto alternativa a Windsor para TikTok/Google/Meta.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
