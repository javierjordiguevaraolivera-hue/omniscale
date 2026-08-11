const GRAPH = "https://graph.facebook.com/v23.0";

/** Cuántas cuentas se consultan a la vez. Facebook limita por app y por usuario. */
const CONCURRENCIA = 8;

export type FacebookAccount = {
  account_id: string; // "1100308604610890" (sin el prefijo act_)
  account_name: string;
  currency: string | null;
  timezone_name: string | null;
  account_status: number | null;
};

export type FacebookAccountSpend = {
  account_id: string;
  account_name: string;
  spend: number;
};

export type FacebookVMResultado = {
  /** Todas las cuentas del VM, excluidas incluidas: es el catálogo de la UI. */
  cuentas: FacebookAccount[];
  /** Gasto de hoy, solo de las cuentas NO excluidas y con gasto > 0. */
  gasto: FacebookAccountSpend[];
  /** Cuentas que se saltaron por estar excluidas. */
  excluidas: number;
  /** Cuentas cuyo insights falló, con el motivo. */
  fallos: Record<string, string>;
};

async function graph(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * Cuentas publicitarias del VM.
 *
 * Con `businessId` usa `/{business_id}/owned_ad_accounts`, que es exactamente
 * lo que hace el flujo de n8n: solo las cuentas que ese BM posee. Sin él, cae a
 * `/me/adaccounts` (todas las que el token alcance), útil cuando no se tiene el
 * ID del BM a mano.
 */
export async function fetchFacebookAccounts(
  token: string,
  businessId?: string | null,
): Promise<FacebookAccount[]> {
  const bid = (businessId ?? "").trim();
  const campos = "id,account_id,name,account_status,currency,timezone_name";
  let url: string | null = bid
    ? `${GRAPH}/${encodeURIComponent(bid)}/owned_ad_accounts?fields=${campos}&limit=100`
    : `${GRAPH}/me/adaccounts?fields=${campos}&limit=100`;

  const cuentas: FacebookAccount[] = [];
  while (url) {
    const body = await graph(url, token);
    for (const c of (body.data ?? []) as Record<string, unknown>[]) {
      // `id` viene como "act_123..."; `account_id` como "123...".
      const accountId =
        String(c.account_id ?? "").trim() ||
        String(c.id ?? "").replace(/^act_/, "").trim();
      if (!accountId) continue;
      cuentas.push({
        account_id: accountId,
        account_name: String(c.name ?? "").trim(),
        currency: (c.currency as string) ?? null,
        timezone_name: (c.timezone_name as string) ?? null,
        account_status:
          c.account_status === undefined ? null : Number(c.account_status),
      });
    }
    url = (body.paging?.next as string) ?? null;
  }
  return cuentas;
}

/** Gasto del día de UNA cuenta (insights a nivel de cuenta). */
async function fetchGastoCuenta(
  token: string,
  cuenta: FacebookAccount,
  day: string,
): Promise<FacebookAccountSpend> {
  const timeRange = JSON.stringify({ since: day, until: day });
  const url =
    `${GRAPH}/act_${encodeURIComponent(cuenta.account_id)}/insights` +
    `?fields=spend,account_name,account_id&level=account` +
    `&time_range=${encodeURIComponent(timeRange)}`;

  const body = await graph(url, token);
  const fila = (body.data ?? [])[0] as Record<string, unknown> | undefined;
  return {
    account_id: cuenta.account_id,
    // El nombre del insights puede venir vacío; el del catálogo es más fiable.
    account_name:
      cuenta.account_name || String(fila?.account_name ?? "").trim() ||
      cuenta.account_id,
    spend: Number(fila?.spend ?? 0) || 0,
  };
}

/** Corre las promesas en tandas para no chocar con el rate limit de Facebook. */
async function enTandas<T, R>(
  items: T[],
  tamano: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += tamano) {
    out.push(...(await Promise.allSettled(items.slice(i, i + tamano).map(fn))));
  }
  return out;
}

/**
 * Flujo completo de un VM: lista sus cuentas, pide el gasto del día de las que
 * NO están excluidas, y descarta las que no gastaron.
 *
 * `excluidas` se pasa desde la base en cada corrida, así que excluir o volver a
 * incluir una cuenta aplica en la medición siguiente sin tocar nada más.
 */
export async function fetchFacebookVM(
  token: string,
  businessId: string | null,
  day: string,
  excluidas: Set<string>,
): Promise<FacebookVMResultado> {
  const cuentas = await fetchFacebookAccounts(token, businessId);
  const aConsultar = cuentas.filter((c) => !excluidas.has(c.account_id));

  const resultados = await enTandas(aConsultar, CONCURRENCIA, (c) =>
    fetchGastoCuenta(token, c, day),
  );

  const gasto: FacebookAccountSpend[] = [];
  const fallos: Record<string, string> = {};
  for (let i = 0; i < aConsultar.length; i++) {
    const r = resultados[i];
    const c = aConsultar[i];
    if (r.status === "fulfilled") {
      // Las cuentas sin gasto no aportan nada al reporte.
      if (r.value.spend > 0) gasto.push(r.value);
    } else {
      fallos[c.account_name || c.account_id] =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
    }
  }

  return {
    cuentas,
    gasto,
    excluidas: cuentas.length - aConsultar.length,
    fallos,
  };
}
