-- ============================================================
-- 0008_everflow_timezone_ny · PENDIENTE
--
-- BUG desde el inicio del proyecto: en Everflow el timezone_id 67 NO es
-- America/New_York, es UTC. New York es el 80. (Catálogo oficial:
-- GET /v1/meta/timezones. El error venía del flujo n8n original y el
-- comentario del baseline lo repetía.)
--
-- Efecto que tenía: la ingesta preguntaba por el "día" en UTC mientras la app
-- corta el día en NY, así que las conversiones entre las 8pm y la medianoche de
-- NY no aparecían en el panel de hoy sino recién al día siguiente. Detectado el
-- 2026-08-12: el panel decía 81 conversiones y la UI de Everflow 82; la que
-- faltaba era de las 10:46pm NY (en UTC ya era 13 de agosto).
--
-- El revenue nunca se perdió: solo quedaba atribuido al día siguiente. Los
-- días ya consolidados no se recalculan (regla del proyecto); de aquí en
-- adelante el corte del día queda alineado con la zona configurada.
-- ============================================================

update settings
   set everflow_timezone_id = 80,
       updated_at = now()
 where id = 1
   and everflow_timezone_id = 67;

comment on column settings.everflow_timezone_id is
  'timezone_id del catalogo de Everflow (GET /v1/meta/timezones). OJO: 80 = America/New_York, 67 = UTC. Debe corresponder con settings.timezone.';

insert into omni_migraciones (version, nombre, nota) values
  ('0008', 'everflow_timezone_ny', 'settings.everflow_timezone_id pasa de 67 a 80: en Everflow 67 es UTC, no New York (80 si). Las conversiones de 8pm-medianoche NY aparecian recien al dia siguiente.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
