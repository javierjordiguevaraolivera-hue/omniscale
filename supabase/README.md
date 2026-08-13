# Migraciones de Supabase

Una migración = **un archivo nuevo**. Nunca se vuelve a ejecutar un archivo ya
ejecutado, ni se edita uno que ya corrió: si algo salió mal o hay que cambiarlo,
se crea el siguiente número corrigiéndolo. Así el historial de la base queda
escrito y se puede leer en orden.

## Cómo trabajamos

1. Cuando un cambio necesita SQL, se crea el **siguiente número libre** y se
   marca **Pendiente** en la tabla de abajo.
2. Antony lo pega completo en Supabase → **SQL Editor** → Run, y cambia
   *Pendiente* por **Ejecutado** en esta tabla. Sin fecha: basta la palabra.
3. Nunca se entrega otra vez un número ya marcado Ejecutado. Si el `0005` está
   ejecutado, lo siguiente que se entrega es el `0006`.
4. Cada archivo se registra solo en `omni_migraciones`, así que el estado real
   también se puede ver en **Ajustes** dentro de la app.

## Estado

| Archivo | Estado | Qué hace |
|---|---|---|
| `0001_baseline.sql` | **Ejecutado** | Esquema inicial completo |
| `0002_registro_migraciones.sql` | **Ejecutado** | Crea el registro `omni_migraciones` |
| `0003_refresh_interval_windsor.sql` | **Ejecutado** | `connections.refresh_interval` para controlar el refresco de Windsor |
| `0004_conexion_zernio.sql` | **Ejecutado** | Permite `platform=zernio` en `connections` |
| `0005_serie_arrastra_valores.sql` | **Ejecutado** | `intraday_series` arrastra el último valor conocido (para las dos cadencias) |
| `0006_facebook_propio_y_exclusiones.sql` | **Ejecutado** | `connections.business_id` + tabla `fb_ad_accounts` con exclusiones por BM |
| `0007_mapeo_por_id_ofertas_y_gastos.sql` | **Ejecutado** | El mapeo pasa a llevarse por `account_id`; la oferta del día se resuelve al leer; `offers` gana `conversion_type` y `active`; `sub1`/`platform` en Everflow; tabla `gastos` |
| `0008_everflow_timezone_ny.sql` | **Ejecutado** | `everflow_timezone_id` 67 → 80: en Everflow 67 es UTC, no New York (80 sí). Las conversiones de 8pm–medianoche NY caían al día siguiente |

## Convenciones

- Nombre: `NNNN_descripcion_corta.sql`, con `NNNN` de 4 dígitos consecutivos.
- La cabecera de cada archivo dice **PENDIENTE** o **YA EJECUTADA**.
- Cada archivo termina con:
  ```sql
  insert into omni_migraciones (version, nombre, nota) values
    ('NNNN', 'descripcion_corta', 'qué cambió y por qué')
  on conflict (version) do nothing;

  notify pgrst, 'reload schema';
  ```
  El `notify` refresca la caché de PostgREST para que las tablas y funciones
  nuevas se vean al instante, sin esperar.
- Se usa `if not exists` / `drop ... if exists` igual, como red de seguridad: si
  un archivo se corre dos veces por error, no debe reventar ni duplicar nada.
- **Nunca** `drop table` de una tabla con datos dentro de una migración sin
  avisarlo en la cabecera del archivo, en mayúsculas.

## Base nueva desde cero

Ejecuta todos los archivos en orden numérico, del `0001` al último.
