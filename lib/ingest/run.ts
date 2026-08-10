import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEverflowDay, type EverflowRow } from "@/lib/ingest/everflow";
import { fetchWindsorDay } from "@/lib/ingest/windsor";
import { fetchZernioDay } from "@/lib/ingest/zernio";
import { fetchFacebookSpend } from "@/lib/ingest/facebook";
import { resolverOferta, type OrigenMapeo } from "@/lib/offer-id";
import {
  datasourcePermitido,
  PLATAFORMAS_WINDSOR,
  scopePermitido,
} from "@/lib/scope";
import { mensajeDeError } from "@/lib/errores";
import { todayInTz, shiftDay } from "@/lib/tz";

type Admin = ReturnType<typeof createAdminClient>;

type Connection = {
  id: string;
  platform: string;
  label: string;
  api_key: string;
  scope: string | null;
  refresh_interval: string | null;
  active: boolean;
};

type SpendMapRow = {
  datasource: string;
  account_name: string;
  campaign: string;
  offer_id: number | null;
  auto_mapped: boolean;
  origen: string;
};

/** Fila de gasto normalizada, venga de Facebook o de Windsor. */
export type SpendRow = {
  datasource: string;
  account_name: string;
  campaign: string; // "" = gasto a nivel cuenta (Facebook)
  clicks: number;
  spend: number;
};

/** Una línea de la bitácora: qué pidió cada fuente y qué se hizo con eso. */
export type DetalleFuente = {
  fuente: string; // everflow | facebook | windsor
  etiqueta: string;
  estado: "ok" | "error";
  recibidas: number;
  aceptadas: number;
  descartadas: number;
  /** Gasto total que trajo la fuente. Si no cambia entre corridas, la fuente
   *  está devolviendo data vieja (no es problema nuestro). */
  gasto?: number;
  /** Conteo por datasource, tal como lo nombra la fuente. */
  por_datasource?: Record<string, number>;
  /** Datasources que el scope dejó fuera, con su conteo. */
  descartados_por_scope?: Record<string, number>;
  scope?: string;
  /** Plataformas pedidas que aún no están conectadas en la fuente. */
  sin_cuenta?: string[];
  /** Cuándo dice la fuente que sincronizó por última vez (solo Zernio). */
  ultima_sync?: string | null;
  error?: string;
};

export type IngestResult = {
  ok: boolean;
  day: string;
  captured_at: string | null;
  everflow_rows: number;
  spend_rows: number;
  descartadas: number;
  sin_asignar: number;
  detalle: DetalleFuente[];
  rollup_days: string[];
  errors: string[];
};

/** Clave del mapeo, para comparar sin ambigüedad. */
const claveMapa = (datasource: string, account: string, campaign: string) =>
  `${datasource} ${account} ${campaign}`;

const sumar = (mapa: Record<string, number>, clave: string) => {
  mapa[clave] = (mapa[clave] ?? 0) + 1;
};

/**
 * La API key de Windsor puede venir de la variable de entorno
 * `WINDSOR_API_KEY` (tiene prioridad) o de la que se guardó en Conexiones.
 * Con la env var basta para que funcione sin tocar la base.
 */
const keyDeWindsor = (conn: Connection) =>
  (process.env.WINDSOR_API_KEY ?? "").trim() || conn.api_key;

/**
 * Corrida de ingesta (la ejecuta el cron cada 2 minutos):
 * 1. Everflow: conversiones/revenue de HOY por oferta y source.
 * 2. Gasto de HOY, en paralelo: cada token de Facebook (nivel cuenta) y
 *    Windsor (nivel campaña, filtrado por el scope de la conexión).
 * 3. Actualiza catálogo de ofertas y el mapeo cuenta/campaña a oferta.
 * 4. Graba los snapshots con el offer_id congelado en cada fila de gasto.
 * 5. Si falta el resumen de AYER, lo consolida y purga snapshots viejos.
 *
 * Todo lo que pasa queda registrado en `ingest_runs`, incluidas las filas que
 * se descartan y por qué: es lo que se ve en la pantalla /logs.
 */
export async function runIngest(
  origen: "cron" | "manual" = "cron",
): Promise<IngestResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const detalle: DetalleFuente[] = [];
  const startedAt = new Date().toISOString();

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
  const wsConns = conns.filter((c) => c.platform === "windsor");
  const zeConns = conns.filter((c) => c.platform === "zernio");

  // --- 1 y 2 en paralelo -------------------------------------------------
  const [efSettled, ...spendSettled] = await Promise.allSettled([
    efConn
      ? fetchEverflowDay(efConn.api_key, day, efTzId)
      : Promise.resolve([] as EverflowRow[]),
    ...fbConns.map((c) => fetchFacebookSpend(c.api_key, day, day)),
    ...wsConns.map((c) =>
      fetchWindsorDay(
        keyDeWindsor(c),
        scopePermitido(c.scope) ?? [...PLATAFORMAS_WINDSOR],
        day,
        c.refresh_interval,
      ),
    ),
    ...zeConns.map((c) => fetchZernioDay(c.api_key, day)),
  ]);

  let efRows: EverflowRow[] = [];
  if (efSettled.status === "fulfilled") {
    efRows = efSettled.value;
    if (efConn) {
      await markConnection(admin, efConn.id, null);
      detalle.push({
        fuente: "everflow",
        etiqueta: efConn.label,
        estado: "ok",
        recibidas: efRows.length,
        aceptadas: efRows.length,
        descartadas: 0,
      });
    }
  } else {
    const msg = mensajeDeError(efSettled.reason);
    errors.push(`everflow: ${msg}`);
    if (efConn) {
      await markConnection(admin, efConn.id, msg);
      detalle.push({
        fuente: "everflow",
        etiqueta: efConn.label,
        estado: "error",
        recibidas: 0,
        aceptadas: 0,
        descartadas: 0,
        error: msg,
      });
    }
  }

  const spendRows: SpendRow[] = [];
  let descartadas = 0;

  // Facebook: nivel cuenta, datasource fijo.
  for (let i = 0; i < fbConns.length; i++) {
    const conn = fbConns[i];
    const settled = spendSettled[i];
    if (settled.status !== "fulfilled") {
      const msg = mensajeDeError(settled.reason);
      errors.push(`facebook [${conn.label}]: ${msg}`);
      await markConnection(admin, conn.id, msg);
      detalle.push({
        fuente: "facebook",
        etiqueta: conn.label,
        estado: "error",
        recibidas: 0,
        aceptadas: 0,
        descartadas: 0,
        error: msg,
      });
      continue;
    }
    const cuentas = settled.value as Awaited<
      ReturnType<typeof fetchFacebookSpend>
    >;
    for (const acc of cuentas) {
      spendRows.push({
        datasource: "facebook",
        account_name: acc.name || acc.account_id,
        campaign: "",
        clicks: acc.clicks,
        spend: acc.spend,
      });
    }
    await markConnection(admin, conn.id, null);
    detalle.push({
      fuente: "facebook",
      etiqueta: conn.label,
      estado: "ok",
      recibidas: cuentas.length,
      aceptadas: cuentas.length,
      descartadas: 0,
      gasto: cuentas.reduce((a, x) => a + x.spend, 0),
      por_datasource: { facebook: cuentas.length },
    });
  }

  // Windsor: un endpoint por plataforma configurada, a nivel de campaña.
  // Ya no se filtra después de traer todo: se pide solo lo que se quiere, así
  // que no hay forma de descartar gasto en silencio.
  for (let i = 0; i < wsConns.length; i++) {
    const conn = wsConns[i];
    const settled = spendSettled[fbConns.length + i];
    const plataformas = scopePermitido(conn.scope) ?? [
      ...PLATAFORMAS_WINDSOR,
    ];

    if (settled.status !== "fulfilled") {
      const msg = mensajeDeError(settled.reason);
      errors.push(`windsor [${conn.label}]: ${msg}`);
      await markConnection(admin, conn.id, msg);
      detalle.push({
        fuente: "windsor",
        etiqueta: conn.label,
        estado: "error",
        recibidas: 0,
        aceptadas: 0,
        descartadas: 0,
        scope: plataformas.join(","),
        error: msg,
      });
      continue;
    }

    const res = settled.value as Awaited<ReturnType<typeof fetchWindsorDay>>;
    let gasto = 0;
    for (const r of res.filas) {
      gasto += r.spend;
      spendRows.push(r);
    }

    // Fallos reales por plataforma (credencial, plan, red).
    const motivos = Object.entries(res.fallos);
    for (const [plat, msg] of motivos) {
      errors.push(`windsor [${conn.label}] ${plat}: ${mensajeDeError(msg)}`);
    }

    // Facebook llega por Windsor Y por token: se contaría dos veces.
    if (
      Object.keys(res.porPlataforma).some((p) => p.includes("facebook")) &&
      fbConns.length > 0
    ) {
      errors.push(
        `windsor [${conn.label}]: Facebook llega por Windsor y también por ${fbConns.length} token(s) de Facebook. El gasto se está contando DOBLE: desactiva una de las dos fuentes.`,
      );
    }

    await markConnection(
      admin,
      conn.id,
      motivos.length > 0 ? motivos.map(([p, m]) => `${p}: ${m}`).join(" | ") : null,
    );
    detalle.push({
      fuente: "windsor",
      etiqueta: conn.label,
      estado: motivos.length > 0 ? "error" : "ok",
      recibidas: res.filas.length,
      aceptadas: res.filas.length,
      descartadas: 0,
      gasto,
      por_datasource: res.porPlataforma,
      scope: plataformas.join(","),
      sin_cuenta: res.sinCuenta.length > 0 ? res.sinCuenta : undefined,
      error:
        motivos.length > 0
          ? motivos.map(([p, m]) => `${p}: ${mensajeDeError(m)}`).join(" | ")
          : undefined,
    });
  }

  // Zernio: nivel campaña (agregado desde anuncios), mismo filtro por scope.
  for (let i = 0; i < zeConns.length; i++) {
    const conn = zeConns[i];
    const settled = spendSettled[fbConns.length + wsConns.length + i];
    if (settled.status !== "fulfilled") {
      const msg = mensajeDeError(settled.reason);
      errors.push(`zernio [${conn.label}]: ${msg}`);
      await markConnection(admin, conn.id, msg);
      detalle.push({
        fuente: "zernio",
        etiqueta: conn.label,
        estado: "error",
        recibidas: 0,
        aceptadas: 0,
        descartadas: 0,
        scope: conn.scope ?? "",
        error: msg,
      });
      continue;
    }

    const permitidas = scopePermitido(conn.scope);
    const res = settled.value as Awaited<ReturnType<typeof fetchZernioDay>>;
    const porDatasource: Record<string, number> = {};
    const fuera: Record<string, number> = {};
    let aceptadas = 0;
    let gasto = 0;

    for (const r of res.filas) {
      sumar(porDatasource, r.datasource);
      if (!datasourcePermitido(r.datasource, permitidas)) {
        sumar(fuera, r.datasource);
        descartadas++;
        continue;
      }
      aceptadas++;
      gasto += r.spend;
      spendRows.push(r);
    }

    if (res.filas.length > 0 && aceptadas === 0) {
      errors.push(
        `zernio [${conn.label}]: llegaron ${res.filas.length} campañas (${Object.keys(
          porDatasource,
        ).join(", ")}) pero el scope "${permitidas?.join(",") ?? "*"}" las descartó todas.`,
      );
    }
    if (res.backfillPendiente) {
      errors.push(
        `zernio [${conn.label}]: Zernio sigue cargando histórico (backfillPending), las cifras pueden estar incompletas.`,
      );
    }

    await markConnection(admin, conn.id, null);
    detalle.push({
      fuente: "zernio",
      etiqueta: conn.label,
      estado: "ok",
      recibidas: res.filas.length,
      aceptadas,
      descartadas: res.filas.length - aceptadas,
      gasto,
      por_datasource: porDatasource,
      descartados_por_scope: fuera,
      scope: permitidas?.join(",") ?? "*",
      ultima_sync: res.ultimaSync,
    });
  }

  // --- 3. catálogo de ofertas -------------------------------------------
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

  // Ofertas conocidas: sirven para validar los números sueltos de los nombres.
  const { data: offersData } = await admin.from("offers").select("offer_id");
  const ofertasConocidas = new Set(
    ((offersData ?? []) as { offer_id: number }[]).map((o) => o.offer_id),
  );

  const mapeo = await syncSpendMap(
    admin,
    spendRows,
    ofertasConocidas,
    capturedAt,
    errors,
  );

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

  let sinAsignar = 0;
  if (spendRows.length > 0) {
    const filas = spendRows.map((r) => {
      const offerId =
        mapeo.get(claveMapa(r.datasource, r.account_name, r.campaign)) ?? null;
      if (offerId === null && r.spend > 0) sinAsignar++;
      return {
        captured_at: capturedAt,
        day,
        datasource: r.datasource,
        account_name: r.account_name,
        campaign: r.campaign,
        clicks: r.clicks,
        spend: r.spend,
        offer_id: offerId,
      };
    });
    const { error } = await admin.from("snap_spend").insert(filas);
    if (error) errors.push(`snap_spend: ${error.message}`);
  }

  // --- 5. consolidación de ayer + purga ----------------------------------
  const rollupDays: string[] = [];
  try {
    const yesterday = shiftDay(day, -1);
    const rolled = await rollupDayIfMissing(
      admin,
      yesterday,
      efConn,
      fbConns,
      wsConns,
      zeConns,
      efTzId,
    );
    if (rolled) rollupDays.push(yesterday);

    const cutoff = shiftDay(day, -Math.max(1, retentionDays));
    await admin.from("snap_offer_source").delete().lt("day", cutoff);
    await admin.from("snap_spend").delete().lt("day", cutoff);
  } catch (e) {
    errors.push(`rollup: ${mensajeDeError(e)}`);
  }

  const resultado: IngestResult = {
    ok: errors.length === 0,
    day,
    captured_at: capturedAt,
    everflow_rows: efRows.length,
    spend_rows: spendRows.length,
    descartadas,
    sin_asignar: sinAsignar,
    detalle,
    rollup_days: rollupDays,
    errors,
  };

  await guardarBitacora(admin, startedAt, origen, resultado);
  return resultado;
}

/** Escribe la corrida en `ingest_runs` y deja solo las últimas 300. */
async function guardarBitacora(
  admin: Admin,
  startedAt: string,
  origen: "cron" | "manual",
  r: IngestResult,
) {
  try {
    await admin.from("ingest_runs").insert({
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      day: r.day,
      origen,
      ok: r.ok,
      everflow_rows: r.everflow_rows,
      spend_rows: r.spend_rows,
      descartadas: r.descartadas,
      sin_asignar: r.sin_asignar,
      detalle: r.detalle,
      errores: r.errors,
    });

    const { data: viejas } = await admin
      .from("ingest_runs")
      .select("id")
      .order("started_at", { ascending: false })
      .range(300, 300);
    const corte = (viejas ?? [])[0]?.id;
    if (corte) await admin.from("ingest_runs").delete().lte("id", corte);
  } catch (e) {
    // La bitácora nunca debe tumbar la ingesta.
    console.error("[ingest_runs]", e);
  }
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
 * Mantiene `spend_map` al día y devuelve el mapeo vigente
 * (plataforma, cuenta, campaña) a offer_id.
 *
 * Una asignación MANUAL nunca se pisa: si tú eliges la oferta a mano, el
 * automático deja de tocar esa fila. Si el nombre trae `oid_XXXX`, ese sí manda
 * (es una instrucción explícita escrita en la plataforma).
 */
async function syncSpendMap(
  admin: Admin,
  spendRows: SpendRow[],
  ofertasConocidas: Set<number>,
  capturedAt: string,
  errors: string[],
): Promise<Map<string, number | null>> {
  const mapeo = new Map<string, number | null>();
  if (spendRows.length === 0) return mapeo;

  const { data: existentes } = await admin
    .from("spend_map")
    .select("datasource,account_name,campaign,offer_id,auto_mapped,origen");
  const previos = new Map(
    ((existentes ?? []) as SpendMapRow[]).map((m) => [
      claveMapa(m.datasource, m.account_name, m.campaign),
      m,
    ]),
  );

  const upserts: {
    datasource: string;
    account_name: string;
    campaign: string;
    offer_id: number | null;
    auto_mapped: boolean;
    origen: OrigenMapeo;
    updated_at: string;
  }[] = [];

  // Una fila de mapeo por combinación única (la fuente puede repetirla).
  const vistas = new Set<string>();

  for (const r of spendRows) {
    const clave = claveMapa(r.datasource, r.account_name, r.campaign);
    if (vistas.has(clave)) continue;
    vistas.add(clave);

    const auto = resolverOferta(r.account_name, r.campaign, ofertasConocidas);
    const prev = previos.get(clave);
    const manualPrevio =
      prev && prev.origen === "manual" && prev.offer_id !== null;

    let offerId: number | null;
    let origen: OrigenMapeo;
    if (auto.origen === "oid-campana" || auto.origen === "oid-cuenta") {
      offerId = auto.offerId; // el oid_ escrito en el nombre siempre gana
      origen = auto.origen;
    } else if (manualPrevio) {
      offerId = prev!.offer_id;
      origen = "manual";
    } else {
      offerId = auto.offerId;
      origen = auto.origen;
    }

    mapeo.set(clave, offerId);
    upserts.push({
      datasource: r.datasource,
      account_name: r.account_name,
      campaign: r.campaign,
      offer_id: offerId,
      auto_mapped: origen !== "manual" && offerId !== null,
      origen,
      updated_at: capturedAt,
    });
  }

  const { error } = await admin.from("spend_map").upsert(upserts);
  if (error) errors.push(`spend_map upsert: ${error.message}`);
  return mapeo;
}

/**
 * Consolida un día pasado en daily_summary (una fila por oferta) si aún no
 * existe. Los números finales se re-consultan a las APIs; el mapeo de gasto a
 * oferta se toma del ÚLTIMO snapshot de ese día (congelado), con respaldo en el
 * mapeo actual.
 */
async function rollupDayIfMissing(
  admin: Admin,
  day: string,
  efConn: Connection | undefined,
  fbConns: Connection[],
  wsConns: Connection[],
  zeConns: Connection[],
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

  // Gasto final del día, de las mismas fuentes que la ingesta intradía
  const spendRows: SpendRow[] = [];
  const settled = await Promise.allSettled([
    ...fbConns.map((c) => fetchFacebookSpend(c.api_key, day, day)),
    ...wsConns.map((c) =>
      fetchWindsorDay(
        keyDeWindsor(c),
        scopePermitido(c.scope) ?? [...PLATAFORMAS_WINDSOR],
        day,
        c.refresh_interval,
      ),
    ),
    ...zeConns.map((c) => fetchZernioDay(c.api_key, day)),
  ]);
  for (let i = 0; i < fbConns.length; i++) {
    const s = settled[i];
    if (s.status !== "fulfilled") continue;
    for (const acc of s.value as Awaited<ReturnType<typeof fetchFacebookSpend>>) {
      spendRows.push({
        datasource: "facebook",
        account_name: acc.name || acc.account_id,
        campaign: "",
        clicks: acc.clicks,
        spend: acc.spend,
      });
    }
  }
  for (let i = 0; i < wsConns.length; i++) {
    const s = settled[fbConns.length + i];
    if (s.status !== "fulfilled") continue;
    // Ya viene solo lo pedido: un endpoint por plataforma, sin filtro posterior.
    spendRows.push(
      ...(s.value as Awaited<ReturnType<typeof fetchWindsorDay>>).filas,
    );
  }
  for (let i = 0; i < zeConns.length; i++) {
    const s = settled[fbConns.length + wsConns.length + i];
    if (s.status !== "fulfilled") continue;
    const permitidas = scopePermitido(zeConns[i].scope);
    const res = s.value as Awaited<ReturnType<typeof fetchZernioDay>>;
    for (const r of res.filas) {
      if (!datasourcePermitido(r.datasource, permitidas)) continue;
      spendRows.push(r);
    }
  }

  // Mapeo congelado: último snapshot de gasto de ese día
  const congelado = new Map<string, number | null>();
  const { data: ultimo } = await admin.rpc("latest_spend", { p_day: day });
  for (const row of (ultimo ?? []) as {
    datasource: string;
    account_name: string;
    campaign: string;
    offer_id: number | null;
  }[]) {
    congelado.set(
      claveMapa(row.datasource, row.account_name, row.campaign),
      row.offer_id,
    );
  }
  const { data: actual } = await admin
    .from("spend_map")
    .select("datasource,account_name,campaign,offer_id");
  const mapaActual = new Map(
    ((actual ?? []) as SpendMapRow[]).map((m) => [
      claveMapa(m.datasource, m.account_name, m.campaign),
      m.offer_id,
    ]),
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
  for (const r of spendRows) {
    if (r.spend === 0) continue;
    const clave = claveMapa(r.datasource, r.account_name, r.campaign);
    const offerId = congelado.get(clave) ?? mapaActual.get(clave) ?? null;
    bucket(offerId ?? 0, offerId === null ? "Sin asignar" : "").spend += r.spend;
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
