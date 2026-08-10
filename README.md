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
   - **Windsor.ai**: una sola API key, a nivel de **campaña**. Se llama **un
     endpoint por plataforma** (`/facebook`, `/tiktok`, `/google_ads`), no
     `/all`: se pide solo lo configurado, así que no hay forma de descartar
     gasto en silencio.
   - **Zernio**: alternativa a Windsor. Una API key cubre Meta, TikTok y Google;
     devuelve una fila por anuncio que agregamos a campaña. Reporta
     `lastSyncedAt`, así que su frescura real se ve en `/logs`.
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

### Zernio como fuente de gasto

[Zernio](https://zernio.com/) expone Meta, TikTok y Google Ads detrás de una
sola API key (`sk_…`). El **OAuth es entre tú y Zernio**: se conecta cada cuenta
publicitaria una vez en su panel, y desde el servidor solo se manda la key.

- Endpoint: `GET https://zernio.com/api/v1/ads` con `Authorization: Bearer`.
- Parámetros que usamos: `fromDate`, `toDate`, `source=all` (para incluir
  anuncios no creados desde Zernio), `limit=500` y paginación por `page`.
- Devuelve una fila por **anuncio**; se agrega por plataforma × cuenta × campaña.
- `metrics.lastSyncedAt` se guarda en la bitácora y sale en `/logs` como
  `sync HH:MM`: es la forma de comprobar si de verdad refresca "cada pocos
  minutos" como promete, sin tener que fiarse del marketing.
- `backfillPending` en la respuesta marca la corrida como error, porque las
  cifras pueden estar incompletas mientras Zernio carga histórico.

Usa el mismo campo *scope* que Windsor. **No actives Zernio y Windsor para la
misma plataforma**: el gasto se contaría dos veces.

### Plataformas de Windsor

El campo **Plataformas** de la conexión decide **a qué endpoints se llama**, uno
por plataforma. Por defecto `facebook,tiktok,google`. Nombres cortos → endpoint
real de Windsor:

| Se escribe | Endpoint |
|---|---|
| `facebook` | `/facebook` |
| `tiktok` | `/tiktok` |
| `google` | `/google_ads` |

Verificado 2026-08-10: `/google` y `/googleads` responden *"We don't have this
connector yet!"*; el bueno es `/google_ads`.

Una plataforma que no esté conectada en el panel de Windsor devuelve HTTP 400
*"No X account for user … was found"*. Eso **no** se trata como error —
aparecería en rojo cada 2 minutos sin que haya nada roto; se muestra en `/logs`
como `[sin conectar: google]`.

Protecciones, porque este campo mal puesto vacía el gasto:

- Se elige con **casillas**, no escribiendo (el autocompletado del navegador metió
  un correo aquí una vez y descartó todo el gasto de Windsor en silencio).
- Un valor que no puede ser un nombre de plataforma se **ignora** y se cae al
  valor por defecto.
- Si `facebook` está en Windsor **y** hay tokens de Facebook activos, la corrida
  se marca como error: ese gasto se estaría contando dos veces.

### Por qué se pide `campaign` y no solo `account_name`

Porque el número de la cuenta y el de la campaña no coinciden. Datos reales del
2026-08-10:

```
A2- 3765   →  "10/08 -- VF - 4225- ALL USA"      $19.72  → oferta 4225
A1 - 3560  →  "10/08 - New - 3560 - heyflow"     $67.31  → oferta 3560
A1 - 3560  →  "10/08 - VF new All - 4069 - AN"   $15.01  → oferta 4069
```

Con solo `account_name`, esos $15.01 se atribuirían a la oferta 3560 y los
$19.72 a la 3765: el profit por oferta saldría mal sin ningún error visible.

## Tablas (ver `supabase/migrations/`)

| Tabla | Para qué |
|---|---|
| `settings` | zona horaria, `timezone_id` de Everflow, días de retención |
| `connections` | Everflow, tokens de Facebook, Windsor y Zernio (con su `scope`) |
| `offers` | catálogo de ofertas (se llena solo desde Everflow) |
| `spend_map` | plataforma × cuenta × campaña → oferta **actual**, y de dónde salió |
| `snap_offer_source` | snapshots del día: conversiones y revenue por oferta × source |
| `snap_spend` | snapshots del día: gasto y clicks por plataforma × cuenta × campaña, con la oferta congelada |
| `daily_summary` | histórico: `day`, `offer_id`, `spend`, `conversions`, `revenue`, `profit` |
| `ingest_runs` | bitácora de las últimas 300 corridas (lo que se ve en `/logs`) |

Solo se conservan snapshots de los últimos días (configurable). El histórico
consolidado no se borra nunca y ocupa muy poco.

## Puesta en marcha

1. **Crear el proyecto en Supabase** y ejecutar en orden todos los archivos de
   `supabase/migrations/` en el SQL Editor. Ver `supabase/README.md`: cada cambio
   en la base va en un archivo nuevo y ninguno se re-ejecuta; en **Ajustes** se
   ve qué migraciones están aplicadas.
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
| `/logs` | bitácora de cada corrida: filas recibidas, guardadas y descartadas por fuente |
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
- **Frescura del gasto de Windsor.** El cron corre cada 2 minutos, pero Windsor
  sirve su propia copia cacheada: el parámetro `refresh_interval` define cada
  cuánto vuelve a consultar la plataforma de origen, y **su valor por defecto es
  6 h**. Consultarlo más seguido no adelanta nada. Los intervalos por plan
  ([precios](https://windsor.ai/pricing/)):

  | Plan | Refresco | Nota |
  |---|---|---|
  | Free / Basic / **Trial** | diario | rechaza `refresh_interval` con HTTP 403 |
  | Standard ($99–118/mes) | 1 h o más | |
  | Plus ($249–299/mes) | 1 h o más | |
  | Professional ($499–598/mes) | 15 min o más | |

  Se configura por conexión en *Conexiones* → **Intervalo de refresco**. En
  planes que no lo admiten hay que dejarlo vacío. Si necesitas gasto de TikTok al
  minuto, la alternativa es ir directo a la API de TikTok Ads, como se hace con
  Facebook.
- **Rate limits:** si el cron cada 2 minutos da errores 429 (Everflow, Windsor o
  Facebook), sube el intervalo en `vercel.json` a `*/5 * * * *`.
- **Plataformas nuevas:** las que agregues en Windsor aparecen solas en el panel
  con solo añadirlas al campo *Plataformas* de esa conexión. No hay que tocar
  código: tablas, gráficos y mapeo ya son genéricos por `datasource`.
- Los gráficos llevan `isAnimationActive={false}`: con la animación activada,
  recharts 3.10 no dibuja las barras en este stack (Next 16 / React 19).
