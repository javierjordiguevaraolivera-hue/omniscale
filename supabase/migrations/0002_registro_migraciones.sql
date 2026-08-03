-- ============================================================
-- 0002_registro_migraciones · PENDIENTE
--
-- Crea el registro de migraciones aplicadas, para saber siempre qué está
-- corrido en esta base sin tener que adivinar. Se ve en Ajustes.
--
-- Nombre `omni_migraciones` a propósito: Supabase ya usa `schema_migrations`
-- para lo suyo y no queremos pisarlo.
-- ============================================================

create table if not exists omni_migraciones (
  version text primary key,          -- '0001', '0002', ...
  nombre text not null,
  aplicada_en timestamptz not null default now(),
  nota text
);

alter table omni_migraciones enable row level security;

drop policy if exists "auth read omni_migraciones" on omni_migraciones;
create policy "auth read omni_migraciones" on omni_migraciones
  for select to authenticated using (true);

-- Deja registrado lo que ya estaba aplicado antes de existir este registro.
insert into omni_migraciones (version, nombre, nota) values
  ('0001', 'baseline', 'Esquema inicial completo: settings, connections, offers, spend_map, snap_offer_source, snap_spend, daily_summary, ingest_runs y las 3 funciones de lectura.'),
  ('0002', 'registro_migraciones', 'Esta tabla.')
on conflict (version) do nothing;

notify pgrst, 'reload schema';
