import { createAdminClient } from "@/lib/supabase/admin";
import { fetchEverflowDay, type EverflowRow } from "@/lib/ingest/everflow";
import { fetchWindsorDay } from "@/lib/ingest/windsor";
import { fetchZernioDay } from "@/lib/ingest/zernio";
import { fetchFacebookVM, type FacebookAccount } from "@/lib/ingest/facebook";
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
  /** Solo Facebook: Business Manager del BM. */
  business_id: string | null;
  active: boolean;
};

type SpendMapRow = {
  datasource: string;
  account_id: string;
  account_name: string;
  campaign: string;
  offer_id: number | null;
  auto_mapped: boolean;
  origen: string;
};

/** Fila de gasto normalizada, venga de Facebook o de Windsor. */
export type SpendRow = {
  datasource: string;
  /**
   * Identificador estable de la cuenta. Facebook y Windsor lo dan los dos; si
   * alguna fuente no lo diera, se usa el nombre para no quedarse sin llave.
   */
  account_id: string;
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
  /** Cuentas que se saltaron por estar excluidas (solo Facebook). */
  cuentas_excluidas?: number;
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
  /** ¿Esta corrida se encargó de consolidar ayer y purgar? */
  rollup: boolean;
  /** Días que consolidó de verdad; vacío si ya estaban hechos. */
  rollup_days: string[];
  errors: string[];
};

/**
 * Separador de las claves compuestas. Se construye en runtime en vez de
 * escribirlo dentro de la cadena: así el archivo queda en ASCII puro. Un byte
 * NUL literal vuelve el archivo "binario" y grep deja de encontrar nada aquí.
 *
 * Tiene que ser un carácter imposible en un nombre de cuenta o de campaña. Con
 * un espacio la clave sería ambigua: "a b" + "c" y "a" + "b c" darían la misma.
 */
const SEP = String.fromCharCode(0);

/**
 * Clave del mapeo. Va por account **ID**, no por nombre: si se renombra una
 * cuenta en la plataforma, el mapeo tiene que seguir en pie. Antes iba por
 * nombre y un renombre mandaba ese gasto a "sin asignar" sin avisar.
 */
const claveMapa = (datasource: string, accountId: string, campaign: string) =>
  [datasource, accountId, campaign].join(SEP);

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
/**
 * Fuentes que se pueden pedir en una corrida. Se separan porque cada una tiene
 * su propio ritmo (ver vercel.json):
 *   - `everflow` y `facebook` son APIs propias sin límite práctico: cada 2 min.
 *   - `windsor` sirve su copia cacheada y solo la refresca cada ~6 h, así que
 *     consultarla cada 2 min sería tirar llamadas a la basura.
 */
export const FUENTES = ["everflow", "facebook", "windsor", "zernio"] as const;
export type Fuente = (typeof FUENTES)[number];

/** Lista de fuentes de una corrida. Vacía o inválida = todas. */
export function parsearFuentes(raw: string | null | undefined): Set<Fuente> {
  const pedidas = (raw ?? "")
    .split(/[,\s]+/)
    .map((s) => s.toLowerCase().trim())
    .filter((s): s is Fuente => (FUENTES as readonly string[]).includes(s));
  return pedidas.length > 0 ? new Set(pedidas) : new Set(FUENTES);
}

/** Señal interna para omitir la consolidación en corridas parciales. */
class SaltarRollup extends Error {}

export async function runIngest(
  origen: "cron" | "manual" = "cron",
  fuentes: Set<Fuente> = new Set(FUENTES),
  opciones: { rollup?: boolean } = {},
): Promise<IngestResult> {
  const completa = FUENTES.every((f) => fuentes.has(f));
  // La consolidación de ayer no tiene que ver con las fuentes que trae ESTA
  // corrida: siempre usa todas las conexiones. Por defecto la hacen las
  // corridas completas (la manual), y un cron puede pedirla con ?rollup=1.
  const haceRollup = opciones.rollup ?? completa;
  const pideEverflow = fuentes.has("everflow");
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
  const efConn = pideEverflow
    ? conns.find((c) => c.platform === "everflow")
    : undefined;
  const fbConns = fuentes.has("facebook")
    ? conns.filter((c) => c.platform === "facebook")
    : [];
  const wsConns = fuentes.has("windsor")
    ? conns.filter((c) => c.platform === "windsor")
    : [];
  const zeConns = fuentes.has("zernio")
    ? conns.filter((c) => c.platform === "zernio")
    : [];

  // Exclusiones de Facebook: se leen EN CADA CORRIDA, así que excluir o volver
  // a incluir una cuenta aplica en la medición siguiente.
  const excluidasPorConexion = new Map<string, Set<string>>();
  if (fbConns.length > 0) {
    const { data: reglas } = await admin
      .from("fb_ad_accounts")
      .select("connection_id,account_id,excluida")
      .eq("excluida", true);
    for (const r of (reglas ?? []) as {
      connection_id: string;
      account_id: string;
    }[]) {
      if (!excluidasPorConexion.has(r.connection_id)) {
        excluidasPorConexion.set(r.connection_id, new Set());
      }
      excluidasPorConexion.get(r.connection_id)!.add(r.account_id);
    }
  }

  // --- 1 y 2 en paralelo -------------------------------------------------
  const [efSettled, ...spendSettled] = await Promise.allSettled([
    efConn
      ? fetchEverflowDay(efConn.api_key, day, efTzId)
      : Promise.resolve([] as EverflowRow[]),
    ...fbConns.map((c) =>
      fetchFacebookVM(
        c.api_key,
        c.business_id,
        day,
        excluidasPorConexion.get(c.id) ?? new Set<string>(),
      ),
    ),
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

  // Facebook: lógica propia. Un BM por conexión, nivel de cuenta.
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

    const res = settled.value as Awaited<ReturnType<typeof fetchFacebookVM>>;

    // Catálogo de cuentas del BM: alimenta la pantalla donde se excluyen.
    await sincronizarCuentasFb(admin, conn.id, res.cuentas, capturedAt, errors);

    for (const acc of res.gasto) {
      spendRows.push({
        datasource: "facebook",
        // El ID es la llave del mapeo y lo que Everflow manda en sub1.
        account_id: acc.account_id || acc.account_name,
        account_name: acc.account_name,
        campaign: "",
        clicks: 0, // el gasto de Facebook se pide a nivel de cuenta, sin clicks
        spend: acc.spend,
      });
    }

    const motivos = Object.entries(res.fallos);
    for (const [cuenta, msg] of motivos) {
      errors.push(`facebook [${conn.label}] ${cuenta}: ${mensajeDeError(msg)}`);
    }

    await markConnection(
      admin,
      conn.id,
      motivos.length > 0
        ? motivos.map(([c, m]) => `${c}: ${m}`).join(" | ").slice(0, 500)
        : null,
    );
    detalle.push({
      fuente: "facebook",
      etiqueta: conn.label,
      estado: motivos.length > 0 ? "error" : "ok",
      recibidas: res.cuentas.length,
      aceptadas: res.gasto.length,
      descartadas: res.excluidas,
      gasto: res.gasto.reduce((a, x) => a + x.spend, 0),
      por_datasource: { facebook: res.gasto.length },
      cuentas_excluidas: res.excluidas > 0 ? res.excluidas : undefined,
      error:
        motivos.length > 0
          ? motivos.map(([c, m]) => `${c}: ${mensajeDeError(m)}`).join(" | ")
          : undefined,
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
        platform: r.platform,
        sub1: r.sub1,
        account_id: r.account_id,
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
        mapeo.get(claveMapa(r.datasource, r.account_id, r.campaign)) ?? null;
      if (offerId === null && r.spend > 0) sinAsignar++;
      return {
        captured_at: capturedAt,
        day,
        datasource: r.datasource,
        account_id: r.account_id,
        account_name: r.account_name,
        campaign: r.campaign,
        clicks: r.clicks,
        spend: r.spend,
        // Rastro de auditoría: lo que decía el mapeo al capturar. Para el día
        // vigente el panel NO lee esto, resuelve contra `spend_map` (0007), así
        // un cambio de oferta a mediodía cuenta para todo el día.
        offer_id: offerId,
      };
    });
    const { error } = await admin.from("snap_spend").insert(filas);
    if (error) errors.push(`snap_spend: ${error.message}`);
  }

  // --- 5. consolidación de ayer + purga ----------------------------------
  // Consolidar ayer vuelve a pedir el día a las APIs, así que necesita TODAS
  // las conexiones, no solo las de esta corrida: con las filtradas quedaría un
  // resumen a medias (p. ej. gasto de Facebook en cero) y como después ya
  // existe la fila, nunca se recalcularía.
  const rollupDays: string[] = [];
  try {
    if (!haceRollup) throw new SaltarRollup();
    const yesterday = shiftDay(day, -1);
    const rolled = await rollupDayIfMissing(
      admin,
      yesterday,
      conns.find((c) => c.platform === "everflow"),
      conns.filter((c) => c.platform === "facebook"),
      conns.filter((c) => c.platform === "windsor"),
      conns.filter((c) => c.platform === "zernio"),
      efTzId,
    );
    if (rolled) rollupDays.push(yesterday);

    const cutoff = shiftDay(day, -Math.max(1, retentionDays));
    await admin.from("snap_offer_source").delete().lt("day", cutoff);
    await admin.from("snap_spend").delete().lt("day", cutoff);
  } catch (e) {
    if (!(e instanceof SaltarRollup)) errors.push(`rollup: ${mensajeDeError(e)}`);
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
    rollup: haceRollup,
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

/**
 * Guarda las cuentas que tiene el BM, sin tocar el `excluida` que eligió Antony.
 * El upsert solo escribe nombre/moneda/estado, así que una cuenta excluida sigue
 * excluida aunque cambie de nombre en Facebook.
 */
async function sincronizarCuentasFb(
  admin: Admin,
  connectionId: string,
  cuentas: FacebookAccount[],
  capturedAt: string,
  errors: string[],
) {
  if (cuentas.length === 0) return;

  const { data: previas } = await admin
    .from("fb_ad_accounts")
    .select("account_id,excluida")
    .eq("connection_id", connectionId);
  const excluidaPrevia = new Map(
    ((previas ?? []) as { account_id: string; excluida: boolean }[]).map((p) => [
      p.account_id,
      p.excluida,
    ]),
  );

  const { error } = await admin.from("fb_ad_accounts").upsert(
    cuentas.map((c) => ({
      connection_id: connectionId,
      account_id: c.account_id,
      account_name: c.account_name,
      currency: c.currency,
      timezone_name: c.timezone_name,
      account_status: c.account_status,
      // Se respeta lo que ya estaba; una cuenta nueva entra incluida.
      excluida: excluidaPrevia.get(c.account_id) ?? false,
      updated_at: capturedAt,
    })),
  );
  if (error) errors.push(`fb_ad_accounts upsert: ${error.message}`);
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
    .select(
      "datasource,account_id,account_name,campaign,offer_id,auto_mapped,origen",
    );
  const previos = new Map(
    ((existentes ?? []) as SpendMapRow[]).map((m) => [
      claveMapa(m.datasource, m.account_id, m.campaign),
      m,
    ]),
  );

  const upserts: {
    datasource: string;
    account_id: string;
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
    const clave = claveMapa(r.datasource, r.account_id, r.campaign);
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
      account_id: r.account_id,
      // El nombre se guarda aunque la llave sea el ID: es lo que se muestra, y
      // un ID de cuenta no hay quien lo reconozca de memoria. Si la cuenta se
      // renombra, aquí se actualiza el nombre y el mapeo sigue intacto.
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

  // Exclusiones vigentes: se respetan también al consolidar.
  const excluidasPorConexion = new Map<string, Set<string>>();
  if (fbConns.length > 0) {
    const { data: reglas } = await admin
      .from("fb_ad_accounts")
      .select("connection_id,account_id")
      .eq("excluida", true);
    for (const r of (reglas ?? []) as {
      connection_id: string;
      account_id: string;
    }[]) {
      if (!excluidasPorConexion.has(r.connection_id)) {
        excluidasPorConexion.set(r.connection_id, new Set());
      }
      excluidasPorConexion.get(r.connection_id)!.add(r.account_id);
    }
  }

  // Gasto final del día, de las mismas fuentes que la ingesta intradía
  const spendRows: SpendRow[] = [];
  const settled = await Promise.allSettled([
    ...fbConns.map((c) =>
      fetchFacebookVM(
        c.api_key,
        c.business_id,
        day,
        excluidasPorConexion.get(c.id) ?? new Set<string>(),
      ),
    ),
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
    const res = s.value as Awaited<ReturnType<typeof fetchFacebookVM>>;
    for (const acc of res.gasto) {
      spendRows.push({
        datasource: "facebook",
        account_id: acc.account_id || acc.account_name,
        account_name: acc.account_name,
        campaign: "",
        clicks: 0,
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

  // Mapeo del cierre del día: última captura de gasto de esa fecha. Ya viene con
  // la oferta resuelta contra el mapeo vigente en ese momento (ver 0007), así
  // que un cambio hecho a mediodía aplica al día completo, que es la regla.
  const congelado = new Map<string, number | null>();
  const { data: ultimo } = await admin.rpc("latest_spend", { p_day: day });
  for (const row of (ultimo ?? []) as {
    datasource: string;
    account_id: string;
    campaign: string;
    offer_id: number | null;
  }[]) {
    congelado.set(
      claveMapa(row.datasource, row.account_id, row.campaign),
      row.offer_id,
    );
  }
  const { data: actual } = await admin
    .from("spend_map")
    .select("datasource,account_id,campaign,offer_id");
  const mapaActual = new Map(
    ((actual ?? []) as SpendMapRow[]).map((m) => [
      claveMapa(m.datasource, m.account_id, m.campaign),
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
    const clave = claveMapa(r.datasource, r.account_id, r.campaign);
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
