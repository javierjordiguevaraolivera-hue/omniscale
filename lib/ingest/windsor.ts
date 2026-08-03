export type WindsorRow = {
  datasource: string; // tiktok | facebook | google | ...
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

const FIELDS = "date,datasource,account_name,source,campaign,clicks,spend";

/**
 * Gasto y clicks del día por plataforma × cuenta × campaña.
 * Un solo endpoint de Windsor.ai cubre todas las plataformas conectadas allí
 * (TikTok, Facebook, Google…), así que no hace falta un token por BM.
 */
export async function fetchWindsorDay(
  apiKey: string,
  day: string,
): Promise<WindsorRow[]> {
  const url = new URL("https://connectors.windsor.ai/all");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("date_from", day);
  url.searchParams.set("date_to", day);
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Windsor ${res.status}: ${text.slice(0, 300)}`);
  }

  let body: { data?: WindsorRaw[] };
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Windsor devolvió algo que no es JSON: ${text.slice(0, 200)}`);
  }

  const filas: WindsorRow[] = [];
  for (const r of body.data ?? []) {
    const datasource = String(r.datasource ?? r.source ?? "").toLowerCase().trim();
    if (!datasource) continue;
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
