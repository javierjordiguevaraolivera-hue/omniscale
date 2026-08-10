import { endpointDeWindsor } from "@/lib/scope";

export type WindsorRow = {
  datasource: string; // facebook | tiktok | google | ...
  account_name: string;
  /** ID de la cuenta en la plataforma. Estable aunque la renombren. */
  account_id: string;
  campaign: string;
  clicks: number;
  spend: number;
};

type WindsorRaw = {
  date?: string;
  datasource?: string;
  source?: string;
  account_id?: string | number;
  account_name?: string;
  campaign?: string;
  clicks?: number | string;
  spend?: number | string;
};

/**
 * Gasto a NIVEL DE CUENTA (sin campaña ni clicks), como pidió Antony, pero
 * pidiendo TAMBIÉN `account_id`. Eso último no es un capricho: sin él Windsor
 * devuelve menos gasto.
 *
 * **En Windsor, la lista de campos cambia el total que devuelve.** Medido el
 * 2026-08-10 contra /facebook, dos rondas idénticas segundos aparte:
 *
 *   date,datasource,spend                       -> 1 fila   $151.94  (total sin agrupar)
 *   date,datasource,account_id,spend            -> 2 filas  $151.94
 *   date,datasource,account_id,account_name,...  -> 2 filas  $151.94  <-- la que usamos
 *   date,datasource,account_name,campaign,spend -> 3 filas  $119.36
 *   date,datasource,account_name,spend          -> 2 filas  $104.54  (pierde $47.40)
 *
 * El total sin agrupar ($151.94) es la referencia: agrupar por `account_name`
 * pierde casi un tercio del gasto, y agrupar por `account_id` no pierde nada.
 * Así que `account_id` es la dimensión buena y `account_name` va solo para poder
 * leerlo. Pedir `clicks` también hace perder gasto, por eso no se pide.
 *
 * Consecuencia a nivel de cuenta: la oferta se resuelve del nombre de la
 * CUENTA. Si ese número no existe como oferta en Everflow (p. ej. "A2- 3765"
 * cuando las ofertas son 3560/4069/4225), esa cuenta queda "sin configurar" y
 * se asigna a mano en la pantalla Cuentas.
 */
const FIELDS = "date,datasource,account_id,account_name,spend";

/**
 * Gasto del día de UNA plataforma, a nivel de campaña.
 *
 * Windsor expone un endpoint por plataforma (`/facebook`, `/tiktok`,
 * `/google_ads`…). Se llama uno por cada plataforma configurada, en vez de
 * `/all` + filtrar: así nunca se descarta nada en silencio.
 *
 * `refreshInterval` define cada cuánto Windsor vuelve a consultar la plataforma
 * de origen (su default es 6h). Los planes TRIAL / Free / Basic lo RECHAZAN con
 * HTTP 403, así que solo se manda cuando está configurado.
 */
export async function fetchWindsorPlatform(
  apiKey: string,
  plataforma: string,
  day: string,
  refreshInterval?: string | null,
): Promise<WindsorRow[]> {
  const url = new URL(
    `https://connectors.windsor.ai/${encodeURIComponent(plataforma)}`,
  );
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("date_from", day);
  url.searchParams.set("date_to", day);
  url.searchParams.set("fields", FIELDS);
  const ri = (refreshInterval ?? "").trim();
  if (ri) url.searchParams.set("refresh_interval", ri);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  let body: { data?: WindsorRaw[]; error?: string } = {};
  let esJson = true;
  try {
    body = JSON.parse(text);
  } catch {
    esJson = false;
  }

  // Windsor manda el motivo en `error`. Se revisa siempre, no solo cuando el
  // status es de error: un cuerpo con `error` nunca debe leerse como "0 filas".
  if (body.error) throw new Error(`Windsor [${plataforma}]: ${body.error}`);
  if (!res.ok) {
    throw new Error(`Windsor [${plataforma}] ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!esJson) {
    throw new Error(
      `Windsor [${plataforma}] devolvió algo que no es JSON: ${text.slice(0, 200)}`,
    );
  }

  const filas: WindsorRow[] = [];
  for (const r of body.data ?? []) {
    // El endpoint ya es de una plataforma; si no viene el campo, se asume esa.
    const datasource =
      String(r.datasource ?? r.source ?? plataforma).toLowerCase().trim() ||
      plataforma;
    const accountId = String(r.account_id ?? "").trim();
    const accountName = String(r.account_name ?? "").trim();
    filas.push({
      datasource,
      // El nombre es lo que se muestra y de donde sale la oferta. Si Windsor no
      // lo trae, se cae al id para no perder la fila.
      account_name: accountName || accountId,
      account_id: accountId,
      // Vacío = gasto a nivel de cuenta. No se pide campaña (ver FIELDS).
      campaign: "",
      // Siempre 0: pedirle clicks a Windsor le hace perder gasto (ver FIELDS).
      clicks: 0,
      spend: Number(r.spend ?? 0) || 0,
    });
  }
  return filas;
}

export type WindsorPorPlataforma = {
  filas: WindsorRow[];
  /** Filas que devolvió cada plataforma, para la bitácora. */
  porPlataforma: Record<string, number>;
  /** Plataformas con un fallo real (credencial, plan, red...). */
  fallos: Record<string, string>;
  /** Plataformas que simplemente no están conectadas en Windsor todavía. */
  sinCuenta: string[];
};

/**
 * Windsor responde HTTP 400 "No <x> account for user ... was found" cuando la
 * plataforma no está conectada en su panel. Eso no es un fallo del sistema:
 * si se tratara como error, cada corrida saldría en rojo cada 2 minutos.
 */
function esSinCuenta(mensaje: string): boolean {
  const m = mensaje.toLowerCase();
  return (
    (m.includes("account for user") && m.includes("was found")) ||
    m.includes("we don't have this connector")
  );
}

/**
 * Llama a Windsor una vez por plataforma configurada y junta el resultado.
 * Si una plataforma falla, las demás siguen: se reporta cuál falló y por qué.
 */
export async function fetchWindsorDay(
  apiKey: string,
  plataformas: string[],
  day: string,
  refreshInterval?: string | null,
): Promise<WindsorPorPlataforma> {
  const endpoints = plataformas.map((p) => ({
    nombre: p,
    endpoint: endpointDeWindsor(p),
  }));

  const resultados = await Promise.allSettled(
    endpoints.map((e) =>
      fetchWindsorPlatform(apiKey, e.endpoint, day, refreshInterval),
    ),
  );

  const filas: WindsorRow[] = [];
  const porPlataforma: Record<string, number> = {};
  const fallos: Record<string, string> = {};
  const sinCuenta: string[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    const { nombre } = endpoints[i];
    const r = resultados[i];
    if (r.status === "fulfilled") {
      porPlataforma[nombre] = r.value.length;
      filas.push(...r.value);
      continue;
    }
    const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
    if (esSinCuenta(msg)) sinCuenta.push(nombre);
    else fallos[nombre] = msg;
  }

  return { filas, porPlataforma, fallos, sinCuenta };
}
