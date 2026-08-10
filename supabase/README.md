# Migraciones de Supabase

Una migración = **un archivo nuevo**. Nunca se vuelve a ejecutar un archivo ya
aplicado, ni se edita un archivo que ya se corrió: si algo salió mal o hay que
cambiarlo, se crea el siguiente número corrigiéndolo. Así el historial de la base
queda escrito y se puede leer en orden.

## Cómo aplicar una migración

1. Abre el archivo pendiente de esta carpeta (el de número más alto sin aplicar).
2. Pégalo completo en Supabase → **SQL Editor** → Run.
3. Cada archivo termina registrándose en la tabla `omni_migraciones`, así que
   después puedes confirmar en **Ajustes** que quedó aplicada.

## Estado

| Archivo | Estado | Qué hace |
|---|---|---|
| `0001_baseline.sql` | aplicada 2026-08-03 | Esquema inicial completo |
| `0002_registro_migraciones.sql` | **Aplicado** | Crea el registro `omni_migraciones` |
| `0003_refresh_interval_windsor.sql` | **Aplicado** | `connections.refresh_interval` para controlar el refresco de Windsor |
| `0004_conexion_zernio.sql` | **Aplicado** | Permite `platform=zernio` en `connections` |

## Convenciones

- Nombre: `NNNN_descripcion_corta.sql`, con `NNNN` de 4 dígitos consecutivos.
- La cabecera de cada archivo dice **PENDIENTE** o **YA APLICADA (fecha)**.
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
