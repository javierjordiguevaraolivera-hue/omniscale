import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEverflowDay, type EverflowRow } from "@/lib/ingest/everflow";
import {
  fetchFacebookSpend,
  parseOfferIdFromName,
  type FacebookAccountSpend,
} from "@/lib/ingest/facebook";
import { todayInTz, shiftDay } from "@/lib/tz";

type Admin = ReturnType<typeof createAdminClient>;

type Connection = {
  id: string;
  platform: string;
  label: string;
  api_key: string;
  active: boolean;
};

type AdAccountRow = {
  account_id: string;
  name: string;
  connection_id: string | null;
  offer_id: number | null;
  auto_mapped: boolean;
};

export type IngestResult = {
  ok: boolean;
  day: string;
  captured_at: string | null;
  everflow_rows: number;
  fb_accounts: number;
  rollup_days: string[];
  errors: string[];
};

/**
 * Corrida de ingesta (la ejecuta el cron cada minuto):
 * 1. Everflow: conversiones/revenue de HOY por oferta x source.
 * 2. Facebook: gasto de HOY por cuenta publicitaria (todas las conexiones en paralelo).
 * 3. Actualiza catálogo de ofertas y cuentas (auto-mapeo oid_XXXX).
 * 4. Graba el snapshot con el offer_id congelado por cuenta.
 * 5. Si falta el resumen de AYER, lo consolida y purga snapshots viejos.
 */
export async function runIngest(): Promise<IngestResult> {
  const admin = createAdminClient();
  const errors: string[] = [];

  const { data: settings } = await admin
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  const tz: string = settings?.timezone ?? "America/New_York";
  const efTzId: number = settings?.everflow_timezone_id ?? 67;
  const retentionDays: number = settings?.retention_days ?? 3;

  const day = todayInTz(tz);
  const capturedAt = new Date().toISOString();

  const { data: connections } = await admin
    .from("connections")
    .select("*")
    .eq("active", true);
  const conns = (connections ?? []) as Connection[];
  const efConn = conns.find((c) => c.platform === "everflow");
  const fbConns = conns.filter((c) => c.platform === "facebook");

  // --- 1 y 2 en paralelo -------------------------------------------------
  const [efSettled, ...fbSettled] = await Promise.allSettled([
    efConn
      ? fetchEverflowDay(efConn.api_key, day, efTzId)
      : Promise.resolve([] as EverflowRow[]),
    ...fbConns.map((c) => fetchFacebookSpend(c.api_key, day, day)),
  ]);

  let efRows: EverflowRow[] = [];
  if (efSettled.status === "fulfilled") {
    efRows = efSettled.value;
    if (efConn) await markConnection(admin, efConn.id, null);
  } else {
    errors.push(`everflow: ${efSettled.reason}`);
    if (efConn) await markConnection(admin, efConn.id, String(efSettled.reason));
  }

  const fbAccounts: (FacebookAccountSpend & { connection_id: string })[] = [];
  for (let i = 0; i < fbConns.length; i++) {
    const settled = fbSettled[i];
    if (settled.status === "fulfilled") {
      for (const acc of settled.value) {
        fbAccounts.push({ ...acc, connection_id: fbConns[i].id });
      }
      await markConnection(admin, fbConns[i].id, null);
    } else {
      errors.push(`facebook [${fbConns[i].label}]: ${settled.reason}`);
      await markConnection(admin, fbConns[i].id, String(settled.reason));
    }
  }

  // --- 3. catálogos ------------------------------------------------------
  if (efRows.length > 0) {
    const offersMap = new Map<number, string>();
    for (const r of efRows) offersMap.set(r.offer_id, r.offer_name);
    const { error } = await admin.from("offers").upsert(
      [...offersMap].map(([offer_id, name]) => ({
        offer_id,
        name,
        updated_at: capturedAt,
      })),
    );
    if (error) errors.push(`offers upsert: ${error.message}`);
  }

  const accountOffer = await syncAdAccounts(admin, fbAccounts, capturedAt, errors);

  // --- 4. snapshots ------------------------------------------------------
  if (efRows.length > 0) {
    const { error } = await admin.from("snap_offer_source").insert(
      efRows.map((r) => ({
        captured_at: capturedAt,
        day,
        offer_id: r.offer_id,
        offer_name: r.offer_name,
        source_id: r.source_id,
        clicks: r.clicks,
        unique_clicks: r.unique_clicks,
        conversions: r.conversions,
        revenue: r.revenue,
      })),
    );
    if (error) errors.push(`snap_offer_source: ${error.message}`);
  }

  if (fbAccounts.length > 0) {
    const { error } = await admin.from("snap_account").insert(
      fbAccounts.map((a) => ({
        captured_at: capturedAt,
        day,
        account_id: a.account_id,
        account_name: a.name,
        offer_id: accountOffer.get(a.account_id) ?? null,
        spend: a.spend,
      })),
    );
    if (error) errors.push(`snap_account: ${error.message}`);
  }

  // --- 5. consolidación de ayer + purga ----------------------------------
  const rollupDays: string[] = [];
  try {
    const yesterday = shiftDay(day, -1);
    const rolled = await rollupDayIfMissing(admin, yesterday, efConn, fbConns, efTzId);
    if (rolled) rollupDays.push(yesterday);

    const cutoff = shiftDay(day, -Math.max(1, retentionDays));
    await admin.from("snap_offer_source").delete().lt("day", cutoff);
    await admin.from("snap_account").delete().lt("day", cutoff);
  } catch (e) {
    errors.push(`rollup: ${e instanceof Error ? e.message : String(e)}`);
  }

  return {
    ok: errors.length === 0,
    day,
    captured_at: capturedAt,
    everflow_rows: efRows.length,
    fb_accounts: fbAccounts.length,
    rollup_days: rollupDays,
    errors,
  };
}

async function markConnection(admin: Admin, id: string, error: string | null) {
  await admin
    .from("connections")
    .update(
      error
        ? { last_error: error.slice(0, 500) }
        : { last_ok_at: new Date().toISOString(), last_error: null },
    )
    .eq("id", id);
}

/**
 * Sincroniza el catálogo de cuentas publicitarias y devuelve el mapeo
 * account_id -> offer_id vigente. El auto-mapeo lee "oid_XXXX" del nombre;
 * un mapeo manual (auto_mapped = false) nunca se pisa automáticamente,
 * salvo que el nombre traiga un oid_ explícito (el nombre manda).
 */
async function syncAdAccounts(
  admin: Admin,
  fbAccounts: (FacebookAccountSpend & { connection_id: string })[],
  capturedAt: string,
  errors: string[],
): Promise<Map<string, number | null>> {
  const mapping = new Map<string, number | null>();
  if (fbAccounts.length === 0) return mapping;

  const { data: existing } = await admin
    .from("ad_accounts")
    .select("account_id,name,connection_id,offer_id,auto_mapped");
  const byId = new Map(
    ((existing ?? []) as AdAccountRow[]).map((a) => [a.account_id, a]),
  );

  const upserts = [];
  for (const acc of fbAccounts) {
    const fromName = parseOfferIdFromName(acc.name);
    const prev = byId.get(acc.account_id);

    let offer_id: number | null;
    let auto_mapped: boolean;
    if (fromName !== null) {
      offer_id = fromName;
      auto_mapped = true;
    } else if (prev && prev.offer_id !== null && !prev.auto_mapped) {
      offer_id = prev.offer_id; // asignación manual: se respeta
      auto_mapped = false;
    } else {
      offer_id = null; // queda pendiente de configurar
      auto_mapped = false;
    }

    mapping.set(acc.account_id, offer_id);
    upserts.push({
      account_id: acc.account_id,
      name: acc.name,
      connection_id: acc.connection_id,
      offer_id,
      auto_mapped,
      updated_at: capturedAt,
    });
  }

  const { error } = await admin.from("ad_accounts").upsert(upserts);
  if (error) errors.push(`ad_accounts upsert: ${error.message}`);
  return mapping;
}

/**
 * Consolida un día pasado en daily_summary (una fila por oferta) si aún no existe.
 * Los números finales se re-consultan a las APIs; el mapeo cuenta->oferta se toma
 * del ÚLTIMO snapshot de ese día (congelado), con fallback al mapeo actual.
 */
async function rollupDayIfMissing(
  admin: Admin,
  day: string,
  efConn: Connection | undefined,
  fbConns: Connection[],
  efTzId: number,
): Promise<boolean> {
  const { count } = await admin
    .from("daily_summary")
    .select("day", { count: "exact", head: true })
    .eq("day", day);
  if ((count ?? 0) > 0) return false;

  // Revenue/conversiones finales del día desde Everflow
  let efRows: EverflowRow[] = [];
  if (efConn) efRows = await fetchEverflowDay(efConn.api_key, day, efTzId);

  // Gasto final del día desde Facebook
  const spendByAccount = new Map<string, { name: string; spend: number }>();
  const settled = await Promise.allSettled(
    fbConns.map((c) => fetchFacebookSpend(c.api_key, day, day)),
  );
  for (const s of settled) {
    if (s.status === "fulfilled") {
      for (const acc of s.value) {
        spendByAccount.set(acc.account_id, { name: acc.name, spend: acc.spend });
      }
    }
  }

  // Mapeo congelado: último snapshot del día
  const frozen = new Map<string, number | null>();
  const { data: lastSnap } = await admin.rpc("latest_accounts", { p_day: day });
  for (const row of (lastSnap ?? []) as { account_id: string; offer_id: number | null }[]) {
    frozen.set(row.account_id, row.offer_id);
  }
  const { data: current } = await admin
    .from("ad_accounts")
    .select("account_id,offer_id");
  const currentMap = new Map(
    ((current ?? []) as { account_id: string; offer_id: number | null }[]).map(
      (a) => [a.account_id, a.offer_id],
    ),
  );

  // Agregar por oferta (0 = sin asignar)
  type Agg = {
    offer_name: string;
    spend: number;
    conversions: number;
    revenue: number;
  };
  const agg = new Map<number, Agg>();
  const bucket = (offerId: number, name = "") => {
    let b = agg.get(offerId);
    if (!b) {
      b = { offer_name: name, spend: 0, conversions: 0, revenue: 0 };
      agg.set(offerId, b);
    }
    if (name && !b.offer_name) b.offer_name = name;
    return b;
  };

  for (const r of efRows) {
    const b = bucket(r.offer_id, r.offer_name);
    b.conversions += r.conversions;
    b.revenue += r.revenue;
  }
  for (const [accountId, { spend }] of spendByAccount) {
    if (spend === 0) continue;
    const offerId = frozen.get(accountId) ?? currentMap.get(accountId) ?? null;
    bucket(offerId ?? 0, offerId === null ? "Sin asignar" : "").spend += spend;
  }

  if (agg.size === 0) return false;

  const rows = [...agg].map(([offer_id, b]) => ({
    day,
    offer_id,
    offer_name: b.offer_name,
    spend: b.spend,
    conversions: b.conversions,
    revenue: b.revenue,
    profit: b.revenue - b.spend,
  }));
  const { error } = await admin.from("daily_summary").upsert(rows);
  if (error) throw new Error(error.message);
  return true;
}
