export type FacebookAccountSpend = {
  account_id: string; // "act_123..."
  name: string;
  spend: number;
};

const GRAPH = "https://graph.facebook.com/v23.0";

type FbAccountNode = {
  id?: string;
  account_id?: string;
  name?: string;
  insights?: { data?: { spend?: string }[] };
};

/**
 * Gasto del día por cuenta publicitaria para un token (una app / BM).
 * Nota: Facebook interpreta el rango en la zona horaria de CADA cuenta publicitaria.
 */
export async function fetchFacebookSpend(
  accessToken: string,
  since: string,
  until: string,
): Promise<FacebookAccountSpend[]> {
  const timeRange = JSON.stringify({ since, until });
  const params = new URLSearchParams({
    fields: `name,account_id,insights.time_range(${timeRange}){spend}`,
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
      accounts.push({
        account_id: acc.id ?? `act_${acc.account_id}`,
        name: acc.name ?? "",
        spend: Number(acc.insights?.data?.[0]?.spend ?? 0),
      });
    }
    url = body.paging?.next ?? null;
  }

  return accounts;
}

/** Extrae el offer ID del nombre de la cuenta: "002 - auto hs oid_3560" -> 3560 */
export function parseOfferIdFromName(name: string): number | null {
  const m = /oid[_\s-]?(\d+)/i.exec(name);
  return m ? Number(m[1]) : null;
}
