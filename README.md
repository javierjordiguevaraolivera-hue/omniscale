# OMNI Scale — reporte automatizado por plataforma

Dashboard que reemplaza el reporte manual: cruza las conversiones y el revenue de
**Everflow** con el gasto de las **cuentas publicitarias de Facebook**, y muestra
gasto, conversiones, costo por conversión, revenue y profit por oferta y por
plataforma. Se actualiza solo cada minuto.

Stack: Next.js (Vercel) + Supabase. Un solo usuario.

---

## Cómo funciona

**Cada 2 minutos** un cron de Vercel llama a `/api/cron/ingest`, que:

1. Pide a Everflow el reporte del día (una fila por oferta × source ID) →
   conversiones y revenue.
2. Pide el gasto del día, en paralelo:
   - **Facebook**: un token por app / BM, a nivel de **cuenta**.
   - **Windsor.ai**: una sola API key, a nivel de **campaña**. Cubre TikTok y
     Google Ads (ver *scope* más abajo).
3. Resuelve la oferta de cada fila de gasto y actualiza `spend_map`.
4. Guarda los snapshots con el `offer_id` **congelado** en ese instante.
5. Cuando cambia el día, consolida el anterior en `daily_summary` (una fila por
   día y oferta) y borra los snapshots viejos según la retención.

### Cómo se resuelve la oferta

Por orden de prioridad, sobre el nombre de la cuenta y de la campaña:

1. `oid_<ID>` en el nombre de la **campaña** (lo más explícito)
2. `oid_<ID>` en el nombre de la **cuenta** — ej. `002 - auto hs oid_3560`
3. un número de la **campaña** que exista como oferta en Everflow — ej.
   `Leads - Tradicional - 3560` → oferta 3560
4. un número de la **cuenta** que exista como oferta en Everflow
5. asignación **manual** desde la pantalla *Cuentas* (nunca se pisa sola)

Exigir que el número exista en `offers` evita confundir un correlativo de la
cuenta (p. ej. el `3876` de `M.S-T.I#41 - AM - 3876`) con un ID de oferta.

**Efecto screenshot:** como cada snapshot graba la oferta que la fila tenía en
ese momento, si mañana pasas una campaña de "seguro de auto" a "seguro de vida",
el histórico sigue mostrando auto y solo lo nuevo aparece como vida.

### Scope de Windsor (evita contar el gasto doble)

Windsor puede traer varias plataformas a la vez. Como el gasto de Facebook ya
entra por su propio token, la conexión de Windsor tiene un campo
**Plataformas**: por defecto `tiktok,google`. Acepta `*` para aceptar todas,
pero si lo pones teniendo tokens de Facebook activos, el gasto de Facebook se
contaría dos veces.

La comparación es por coincidencia parcial, no exacta: escribir `google` también
acepta un `datasource` que Windsor devuelva como `google_ads`. Es a propósito —
con comparación exacta, un cambio de nombre en Windsor haría desaparecer ese
gasto sin dar ningún error.

## Tablas (ver `supabase/schema.sql`)

| Tabla | Para qué |
|---|---|
| `settings` | zona horaria, `timezone_id` de Everflow, días de retención |
| `connections` | Everflow, tokens de Facebook y Windsor (con su `scope`) |
| `offers` | catálogo de ofertas (se llena solo desde Everflow) |
| `spend_map` | plataforma × cuenta × campaña → oferta **actual**, y de dónde salió |
| `snap_offer_source` | snapshots del día: conversiones y revenue por oferta × source |
| `snap_spend` | snapshots del día: gasto y clicks por plataforma × cuenta × campaña, con la oferta congelada |
| `daily_summary` | histórico: `day`, `offer_id`, `spend`, `conversions`, `revenue`, `profit` |

Solo se conservan snapshots de los últimos días (configurable). El histórico
consolidado no se borra nunca y ocupa muy poco.

## Puesta en marcha

1. **Crear el proyecto en Supabase** y ejecutar todo `supabase/schema.sql` en el
   SQL Editor.
2. **Variables de entorno** (local en `.env.local`, en Vercel en Project Settings
   → Environment Variables), según `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — solo servidor, nunca con prefijo `NEXT_PUBLIC`
   - `CRON_SECRET` — cualquier cadena aleatoria; con ella presente, Vercel firma
     las llamadas del cron y el endpoint rechaza lo demás
3. **URLs de autenticación** en Supabase → Authentication → URL Configuration.
   Dominio de producción: **omniscale.pro**.
   - Site URL: `https://omniscale.pro`
   - Redirect URLs:
     ```
     https://omniscale.pro/**
     https://www.omniscale.pro/**
     https://*.vercel.app/**
     http://localhost:3030/**
     ```
   Los comodines cubren las tres rutas que usa la app: `/dashboard` (confirmación
   de registro), `/auth/update-password` (recuperar contraseña) y `/auth/confirm`
   (verificación por token).
4. **Crear el usuario** en `/auth/sign-up` (o desde Authentication en Supabase) y
   luego, para que nadie más se registre, desactivar *Allow new users to sign up*
   en Supabase → Authentication → Providers → Email.
5. **Registrar credenciales** en `/connections`: la API key de Everflow, un token
   de Facebook por cada app / VM, y la API key de Windsor (deja *Plataformas* en
   `tiktok`). Pulsa **Actualizar ahora** para la primera carga.
6. **Revisar `/accounts`**: asignar oferta a las combinaciones que quedaron
   &ldquo;sin configurar&rdquo;.

El cron ya viene definido en `vercel.json` (`*/2 * * * *`). Requiere plan Pro; en
Hobby solo se permite una ejecución diaria.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | landing pública |
| `/dashboard` | día en curso: KPIs, dos gráficos, resumen por plataforma, oferta × plataforma y gasto por campaña |
| `/history` | histórico consolidado con rangos de 3, 7, 15 y 30 días |
| `/accounts` | mapeo plataforma · cuenta · campaña → oferta |
| `/connections` | credenciales de Everflow, Facebook y Windsor |
| `/settings` | zona horaria y retención |
| `/demo` | vista de muestra con datos inventados; se puede borrar |
| `/terms-and-conditions`, `/privacy-policy`, `/data-deletion-policy` | legales |

## Desarrollo

```bash
npm run dev
```

## Notas

- **Zona horaria:** define dónde empieza el día. Everflow usa un `timezone_id`
  numérico (67 = New York) que debe coincidir con la zona elegida. Facebook
  interpreta el rango según la zona de cada cuenta publicitaria, así que
  conviene tenerlas todas en la misma.
- **Rate limits:** si el cron cada 2 minutos da errores 429 (Everflow, Windsor o
  Facebook), sube el intervalo en `vercel.json` a `*/5 * * * *`.
- **Plataformas nuevas:** las que agregues en Windsor aparecen solas en el panel
  con solo añadirlas al campo *Plataformas* de esa conexión. No hay que tocar
  código: tablas, gráficos y mapeo ya son genéricos por `datasource`.
- Los gráficos llevan `isAnimationActive={false}`: con la animación activada,
  recharts 3.10 no dibuja las barras en este stack (Next 16 / React 19).
