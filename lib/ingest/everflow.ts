export type EverflowRow = {
  offer_id: number;
  offer_name: string;
  source_id: string;
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
 * Reporte de afiliado de Everflow para un día: una fila por oferta x source_id.
 * Mismo endpoint y normalización que el flujo original de n8n.
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
        columns: [{ column: "offer" }, { column: "source_id" }],
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

    rows.push({
      offer_id: Number(offer.id) || 0,
      offer_name: offer.label ?? "",
      source_id: String(source.id ?? source.label ?? "").trim() || "unknown",
      clicks: r.total_click ?? 0,
      unique_clicks: r.unique_click ?? 0,
      conversions: r.cv ?? 0,
      revenue: r.revenue ?? 0,
    });
  }

  return rows;
}
