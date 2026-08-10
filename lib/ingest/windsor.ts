import { endpointDeWindsor } from "@/lib/scope";

export type WindsorRow = {
  datasource: string; // facebook | tiktok | google | ...
  account_name: string;
  campaign: string;
  clicks: number;
  spend: number;
};

type WindsorRaw = {
  date?: string;
  datasource?: string;
  source?: string;
  account_name?: string;
  campaign?: string;
  clicks?: number | string;
  spend?: number | string;
};

/**
 * `campaign` es obligatorio para la atribución, no un lujo: en las cuentas de
 * Antony el número de la cuenta y el de la campaña NO coinciden (la cuenta
 * "A1 - 3560" corre campañas de la oferta 3560 y de la 4069). Pedir solo
 * account_name atribuiría ese gasto a la oferta equivocada.
 */
const FIELDS = "date,datasource,account_name,campaign,clicks,spend";

/**
 * Gasto y clicks del día de UNA plataforma, a nivel de campaña.
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
    filas.push({
      datasource,
      account_name: String(r.account_name ?? "").trim(),
      campaign: String(r.campaign ?? "").trim(),
      clicks: Number(r.clicks ?? 0) || 0,
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
