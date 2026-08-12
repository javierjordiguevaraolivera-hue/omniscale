import { clavePlataforma, esAccountId, esSinDato } from "@/lib/format";

export type EverflowRow = {
  offer_id: number;
  offer_name: string;
  source_id: string;
  /** source_id normalizado: facebook | tiktok | google | youtube | taboola. "" = huérfano. */
  platform: string;
  /** sub1 crudo, tal como llegó. */
  sub1: string;
  /** sub1 validado como account id (puros dígitos). null = no es un ID. */
  account_id: string | null;
  clicks: number;
  unique_clicks: number;
  conversions: number;
  revenue: number;
};

type EverflowColumn = { column_type?: string; id?: string | number; label?: string };
type EverflowTableRow = {
  columns?: EverflowColumn[];
  reporting?: {
    total_click?: number;
    unique_click?: number;
    cv?: number;
    revenue?: number;
  };
};

/**
 * Reporte de afiliado de Everflow para un día: una fila por oferta × source_id ×
 * sub1.
 *
 * Convención de los parámetros (la pone Antony en los links):
 *   source_id -> la plataforma ("Facebook Ads", "YouTube Ads"...)
 *   sub1      -> el ID de la cuenta publicitaria
 *   sub2..5   -> campaña, ad set, ad, media buyer (todavía no se usan)
 *
 * Ojo con dos cosas verificadas contra la API el 2026-08-12:
 *   * el vacío llega como el texto `"N/A"`, no como cadena vacía;
 *   * hoy `sub1` todavía trae el NOMBRE de la campaña ("12/08 - MPR/FPR - 3560")
 *     porque las campañas viejas no se han cambiado. Eso no es un ID y se
 *     ignora: la fila sigue contando por oferta, solo que no se puede repartir
 *     por cuenta.
 */
export async function fetchEverflowDay(
  apiKey: string,
  day: string,
  timezoneId: number,
): Promise<EverflowRow[]> {
  const res = await fetch(
    "https://api.eflow.team/v1/affiliates/reporting/entity/table",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Eflow-Api-Key": apiKey,
      },
      body: JSON.stringify({
        from: day,
        to: day,
        timezone_id: timezoneId,
        currency_id: "USD",
        columns: [
          { column: "offer" },
          { column: "source_id" },
          { column: "sub1" },
        ],
        query: {},
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`Everflow ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const rows: EverflowRow[] = [];

  for (const fila of (data.table ?? []) as EverflowTableRow[]) {
    const col = (tipo: string) =>
      (fila.columns ?? []).find((c) => c.column_type === tipo) ?? {};
    const r = fila.reporting ?? {};
    if ((r.cv ?? 0) < 1) continue; // filas sin conversiones no aportan

    const offer = col("offer") as EverflowColumn;
    const source = col("source_id") as EverflowColumn;
    const s1 = col("sub1") as EverflowColumn;

    const sourceId = String(source.id ?? source.label ?? "").trim();
    const sub1 = esSinDato(String(s1.id ?? s1.label ?? ""))
      ? ""
      : String(s1.id ?? s1.label ?? "").trim();

    rows.push({
      offer_id: Number(offer.id) || 0,
      offer_name: offer.label ?? "",
      source_id: esSinDato(sourceId) ? "unknown" : sourceId,
      platform: clavePlataforma(sourceId) ?? "",
      sub1,
      account_id: esAccountId(sub1) ? sub1.trim() : null,
      clicks: r.total_click ?? 0,
      unique_clicks: r.unique_click ?? 0,
      conversions: r.cv ?? 0,
      revenue: r.revenue ?? 0,
    });
  }

  return rows;
}
