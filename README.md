# OMNI Scale — reporte automatizado por plataforma

Dashboard que reemplaza el reporte manual: cruza las conversiones y el revenue de
**Everflow** con el gasto de las **cuentas publicitarias de Facebook**, y muestra
gasto, conversiones, costo por conversión, revenue y profit por oferta y por
plataforma. Se actualiza solo cada minuto.

Stack: Next.js (Vercel) + Supabase. Un solo usuario.

---

## Cómo funciona

**Cada minuto** un cron de Vercel llama a `/api/cron/ingest`, que:

1. Pide a Everflow el reporte del día (una fila por oferta × source ID).
2. Pide el gasto del día a cada token de Facebook registrado, en paralelo.
3. Descubre las cuentas publicitarias y les asigna oferta leyendo `oid_<ID>` del
   nombre (ej. `002 - auto hs oid_3560` → oferta 3560). Si el nombre no lo trae,
   la cuenta queda "sin configurar" para asignarla a mano en **Cuentas**.
4. Guarda un snapshot con el `offer_id` **congelado** en ese instante.
5. Cuando cambia el día, consolida el anterior en `daily_summary` (una fila por
   día y oferta) y borra los snapshots por minuto más viejos que la retención.

**Efecto screenshot:** como cada snapshot graba la oferta que la cuenta tenía en
ese momento, si mañana pasas una cuenta de "seguro de auto" a "seguro de vida",
el histórico sigue mostrando auto y solo lo nuevo aparece como vida.

## Tablas (ver `supabase/schema.sql`)

| Tabla | Para qué |
|---|---|
| `settings` | zona horaria, `timezone_id` de Everflow, días de retención |
| `connections` | API key de Everflow y un token por app / BM de Facebook |
| `offers` | catálogo de ofertas (se llena solo desde Everflow) |
| `ad_accounts` | cuentas publicitarias y su oferta **actual** |
| `snap_offer_source` | snapshots del día: conversiones y revenue por oferta × source |
| `snap_account` | snapshots del día: gasto por cuenta, con la oferta congelada |
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
5. **Registrar credenciales** en `/connections`: la API key de Everflow y un token
   de Facebook por cada app / VM. Pulsa **Actualizar ahora** para la primera carga.
6. **Revisar `/accounts`**: asignar oferta a las cuentas que no traigan `oid_` en
   el nombre.

El cron ya viene definido en `vercel.json` (`* * * * *`). Requiere plan Pro; en
Hobby solo se permite una ejecución diaria.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | landing pública |
| `/dashboard` | día en curso: KPIs, dos gráficos, tabla oferta × plataforma, cuentas |
| `/history` | histórico consolidado con rangos de 3, 7, 15 y 30 días |
| `/accounts` | mapeo cuenta publicitaria → oferta |
| `/connections` | credenciales de Everflow y de las plataformas de gasto |
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
- **Rate limit de Everflow:** si el cron cada minuto da errores 429, sube el
  intervalo en `vercel.json` a `*/2 * * * *`.
- **TikTok y Google** ya se pueden registrar como conexión; falta su lector de
  gasto. El resto del sistema (tablas, gráficos, mapeo) ya los soporta.
- Los gráficos llevan `isAnimationActive={false}`: con la animación activada,
  recharts 3.10 no dibuja las barras en este stack (Next 16 / React 19).
