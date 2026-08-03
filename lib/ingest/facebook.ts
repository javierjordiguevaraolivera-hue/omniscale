export type FacebookAccountSpend = {
  account_id: string; // "act_123..."
  name: string;
  clicks: number;
  spend: number;
};

const GRAPH = "https://graph.facebook.com/v23.0";

type FbAccountNode = {
  id?: string;
  account_id?: string;
  name?: string;
  insights?: { data?: { spend?: string; clicks?: string }[] };
};

/**
 * Gasto y clicks del día por cuenta publicitaria para un token (una app / BM).
 * Nivel cuenta: la convención de mapeo en Facebook es `oid_XXXX` en el NOMBRE
 * DE LA CUENTA, así que no hace falta bajar a campaña.
 *
 * Nota: Facebook interpreta el rango en la zona horaria de CADA cuenta.
 */
export async function fetchFacebookSpend(
  accessToken: string,
  since: string,
  until: string,
): Promise<FacebookAccountSpend[]> {
  const timeRange = JSON.stringify({ since, until });
  const params = new URLSearchParams({
    fields: `name,account_id,insights.time_range(${timeRange}){spend,clicks}`,
    limit: "100",
    access_token: accessToken,
  });

  let url: string | null = `${GRAPH}/me/adaccounts?${params.toString()}`;
  const accounts: FacebookAccountSpend[] = [];

  // pagina hasta agotar resultados
  while (url) {
    const res: Response = await fetch(url, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      const msg = body?.error?.message ?? JSON.stringify(body).slice(0, 300);
      throw new Error(`Facebook: ${msg}`);
    }
    for (const acc of (body.data ?? []) as FbAccountNode[]) {
      const ins = acc.insights?.data?.[0];
      accounts.push({
        account_id: acc.id ?? `act_${acc.account_id}`,
        name: acc.name ?? "",
        clicks: Number(ins?.clicks ?? 0) || 0,
        spend: Number(ins?.spend ?? 0) || 0,
      });
    }
    url = body.paging?.next ?? null;
  }

  return accounts;
}
