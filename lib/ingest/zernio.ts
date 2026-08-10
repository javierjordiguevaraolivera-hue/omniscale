import type { SpendRow } from "@/lib/ingest/run";

/**
 * Zernio.com — una sola API key cubre Meta, TikTok y Google Ads.
 *
 * El OAuth es entre TÚ y Zernio, hecho una vez en su panel al conectar cada
 * cuenta publicitaria. Desde aquí solo mandamos la API key.
 *
 * Devuelve una fila por ANUNCIO; nosotros agregamos a nivel de campaña, que es
 * la granularidad del resto del sistema.
 */

const BASE = "https://zernio.com/api/v1/ads";
const LIMITE_PAGINA = 500; // máximo que acepta la API
const MAX_PAGINAS = 20; // tope de seguridad: 10.000 anuncios

type ZernioAd = {
  platform?: string;
  status?: string;
  campaignName?: string;
  platformCampaignId?: string;
  platformAdAccountId?: string;
  platformAdAccountName?: string;
  metrics?: {
    spend?: number | string;
    clicks?: number | string;
    impressions?: number | string;
    lastSyncedAt?: string;
  };
};

type ZernioResp = {
  ads?: ZernioAd[];
  backfillPending?: boolean;
  pagination?: { page?: number; limit?: number; total?: number; pages?: number };
  error?: string;
  message?: string;
};

export type ZernioResultado = {
  filas: SpendRow[];
  /** Anuncios crudos que devolvió la API, antes de agregar por campaña. */
  anuncios: number;
  /** Sincronización más reciente que reporta Zernio. Sirve para saber si la
   *  data viene fresca o cacheada, sin tener que adivinar. */
  ultimaSync: string | null;
  /** Zernio sigue cargando histórico: los números pueden estar incompletos. */
  backfillPendiente: boolean;
};

const numero = (v: unknown) => Number(v ?? 0) || 0;

export async function fetchZernioDay(
  apiKey: string,
  day: string,
): Promise<ZernioResultado> {
  const anuncios: ZernioAd[] = [];
  let backfillPendiente = false;

  for (let page = 1; page <= MAX_PAGINAS; page++) {
    const url = new URL(BASE);
    url.searchParams.set("fromDate", day);
    url.searchParams.set("toDate", day);
    url.searchParams.set("source", "all"); // no solo los creados desde Zernio
    url.searchParams.set("limit", String(LIMITE_PAGINA));
    url.searchParams.set("page", String(page));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const text = await res.text();

    let body: ZernioResp = {};
    let esJson = true;
    try {
      body = JSON.parse(text);
    } catch {
      esJson = false;
    }

    // El motivo puede venir en el cuerpo aunque el status sea 200: nunca debe
    // leerse como "cero gasto".
    const motivo = body.error ?? body.message;
    if (motivo && !body.ads) throw new Error(`Zernio: ${motivo}`);
    if (!res.ok) throw new Error(`Zernio ${res.status}: ${text.slice(0, 200)}`);
    if (!esJson) {
      throw new Error(`Zernio devolvió algo que no es JSON: ${text.slice(0, 200)}`);
    }

    const lote = body.ads ?? [];
    anuncios.push(...lote);
    if (body.backfillPending) backfillPendiente = true;

    const totalPaginas = body.pagination?.pages ?? 1;
    if (lote.length === 0 || page >= totalPaginas) break;
  }

  // Agregar por plataforma × cuenta × campaña
  const porClave = new Map<string, SpendRow>();
  let ultimaSync: string | null = null;

  for (const ad of anuncios) {
    const datasource = String(ad.platform ?? "").toLowerCase().trim();
    if (!datasource) continue;

    const account =
      ad.platformAdAccountName?.trim() ||
      ad.platformAdAccountId?.trim() ||
      "";
    const campaign =
      ad.campaignName?.trim() || ad.platformCampaignId?.trim() || "";

    const clave = `${datasource}|${account}|${campaign}`;
    const fila = porClave.get(clave) ?? {
      datasource,
      account_name: account,
      campaign,
      clicks: 0,
      spend: 0,
    };
    fila.spend += numero(ad.metrics?.spend);
    fila.clicks += numero(ad.metrics?.clicks);
    porClave.set(clave, fila);

    const sync = ad.metrics?.lastSyncedAt;
    if (sync && (!ultimaSync || sync > ultimaSync)) ultimaSync = sync;
  }

  return {
    filas: [...porClave.values()],
    anuncios: anuncios.length,
    ultimaSync,
    backfillPendiente,
  };
}
