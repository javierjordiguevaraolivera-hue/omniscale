"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runIngest } from "@/lib/ingest/run";
import {
  esRefreshIntervalValido,
  sanearScope,
  SCOPE_WINDSOR_DEFAULT,
} from "@/lib/scope";
import { mensajeDeError } from "@/lib/errores";

// Las acciones de formulario devuelven `null` si todo fue bien, o el mensaje de
// error para que se muestre en la propia pantalla (ver components/action-form).

/** Todas las acciones exigen sesión iniciada. */
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("No autorizado");
}

/** Envuelve una acción: captura el fallo y lo devuelve como texto. */
async function conManejoDeError(
  fn: () => Promise<void>,
): Promise<string | null> {
  try {
    await requireUser();
    await fn();
    return null;
  } catch (e) {
    console.error("[action]", e);
    return mensajeDeError(e);
  }
}

export async function addConnection(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const platform = String(formData.get("platform") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    const apiKey = String(formData.get("api_key") ?? "").trim();
    if (!["everflow", "facebook", "windsor", "zernio"].includes(platform)) {
      throw new Error("Plataforma no válida");
    }
    if (!apiKey) throw new Error("Falta la credencial");

    let scope: string | null = null;
    let refreshInterval: string | null = null;
    let businessId: string | null = null;
    if (platform === "facebook") {
      const bid = String(formData.get("business_id") ?? "").trim();
      if (bid && !/^\d{5,25}$/.test(bid)) {
        throw new Error(
          "El Business ID debe ser solo números (lo ves en la URL del Business Manager). Déjalo vacío para usar todas las cuentas del token.",
        );
      }
      businessId = bid || null;
    }
    if (platform === "zernio") {
      const limpio = sanearScope(String(formData.get("scope") ?? ""));
      if (limpio.invalidos.length > 0) {
        throw new Error(
          `"${limpio.invalidos.join('", "')}" no es un nombre de plataforma. Marca las plataformas en las casillas.`,
        );
      }
      scope = limpio.scope || SCOPE_WINDSOR_DEFAULT;
    }
    if (platform === "windsor") {
      const limpio = sanearScope(String(formData.get("scope") ?? ""));
      if (limpio.invalidos.length > 0) {
        throw new Error(
          `"${limpio.invalidos.join('", "')}" no es un nombre de plataforma. Marca las plataformas en las casillas.`,
        );
      }
      scope = limpio.scope || SCOPE_WINDSOR_DEFAULT;

      const ri = String(formData.get("refresh_interval") ?? "").trim();
      if (!esRefreshIntervalValido(ri)) {
        throw new Error(`"${ri}" no es un intervalo de refresco válido.`);
      }
      refreshInterval = ri || null;
    }

    const admin = createAdminClient();
    const { error } = await admin.from("connections").insert({
      platform,
      label: label || platform,
      api_key: apiKey,
      scope,
      refresh_interval: refreshInterval,
      business_id: businessId,
    });
    if (error) throw error;
    revalidatePath("/connections");
    revalidatePath("/accounts");
  });
}

export async function deleteConnection(
  _previo: string | null,
  formData: FormData,
) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "");
    const admin = createAdminClient();
    const { error } = await admin.from("connections").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/connections");
  });
}

export async function toggleConnection(
  _previo: string | null,
  formData: FormData,
) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "");
    const active = String(formData.get("active") ?? "") === "true";
    const admin = createAdminClient();
    const { error } = await admin
      .from("connections")
      .update({ active: !active })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/connections");
  });
}

/** Ajusta las plataformas que aporta una conexión de Windsor. */
export async function updateScope(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "");
    const limpio = sanearScope(String(formData.get("scope") ?? ""));
    if (limpio.invalidos.length > 0) {
      throw new Error(
        `"${limpio.invalidos.join('", "')}" no es un nombre de plataforma. Marca las plataformas en las casillas.`,
      );
    }
    const scope = limpio.scope || SCOPE_WINDSOR_DEFAULT;

    const ri = String(formData.get("refresh_interval") ?? "").trim();
    if (!esRefreshIntervalValido(ri)) {
      throw new Error(`"${ri}" no es un intervalo de refresco válido.`);
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("connections")
      .update({ scope, refresh_interval: ri || null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/connections");
    revalidatePath("/logs");
  });
}

export async function updateSettings(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const timezone = String(formData.get("timezone") ?? "America/New_York");
    // 80 = America/New_York en el catálogo de Everflow (67 es UTC).
    const everflowTzId = Number(formData.get("everflow_timezone_id") ?? 80);
    const retention = Number(formData.get("retention_days") ?? 3);
    // valida que la zona exista
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });

    const admin = createAdminClient();
    const { error } = await admin
      .from("settings")
      .update({
        timezone,
        everflow_timezone_id: everflowTzId,
        retention_days: Math.min(Math.max(retention, 1), 30),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;
    revalidatePath("/settings");
    revalidatePath("/dashboard");
  });
}

/**
 * Asignación manual de oferta a una combinación plataforma × cuenta × campaña.
 *
 * Aplica al DÍA COMPLETO de hoy, no solo de aquí en adelante: el panel del día
 * vigente resuelve la oferta contra esta tabla al leer (ver migración 0007), así
 * que cambiarla al mediodía recuenta la mañana también. El histórico ya
 * consolidado no se toca nunca.
 *
 * La cuenta se identifica por ID: si la renombras en la plataforma, el mapeo
 * sigue en pie.
 */
export async function assignOffer(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const datasource = String(formData.get("datasource") ?? "");
    const accountId = String(formData.get("account_id") ?? "");
    const campaign = String(formData.get("campaign") ?? "");
    const raw = String(formData.get("offer_id") ?? "");
    const offerId = raw === "" ? null : Number(raw);

    const admin = createAdminClient();
    const { error } = await admin
      .from("spend_map")
      .update({
        offer_id: offerId,
        auto_mapped: false,
        origen: offerId === null ? "sin-configurar" : "manual",
        updated_at: new Date().toISOString(),
      })
      .eq("datasource", datasource)
      .eq("account_id", accountId)
      .eq("campaign", campaign);
    if (error) throw error;
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
  });
}

/* ============================================================
 * Gastos que no son de ads (suscripciones, herramientas, contabilidad).
 * Se descuentan del resultado MENSUAL, nunca del día: el panel de hoy es
 * gasto de ads contra revenue y nada más.
 * ============================================================ */

/** Alta o edición. Una suscripción exige día de cobro; un gasto único, no. */
export async function guardarGasto(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "").trim();
    const tipo = String(formData.get("tipo") ?? "suscripcion");
    const diaRaw = String(formData.get("dia_cobro") ?? "").trim();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const monto = Number(formData.get("monto") ?? 0);

    if (!nombre) throw new Error("Ponle nombre a la plataforma.");
    if (!Number.isFinite(monto) || monto < 0) {
      throw new Error("El monto tiene que ser un número en dólares.");
    }
    if (tipo !== "suscripcion" && tipo !== "unico") {
      throw new Error("Tipo inválido.");
    }

    let diaCobro: number | null = null;
    if (tipo === "suscripcion") {
      diaCobro = Number(diaRaw);
      if (!Number.isInteger(diaCobro) || diaCobro < 1 || diaCobro > 31) {
        throw new Error(
          "Una suscripción necesita el día del mes en que cobra (1 a 31).",
        );
      }
    }

    const fila = {
      nombre,
      motivo: String(formData.get("motivo") ?? "").trim(),
      categoria: String(formData.get("categoria") ?? "herramientas").trim(),
      monto,
      tipo,
      dia_cobro: diaCobro,
      inicio: String(formData.get("inicio") ?? "") || new Date().toISOString().slice(0, 10),
      notas: String(formData.get("notas") ?? "").trim(),
      updated_at: new Date().toISOString(),
    };

    const admin = createAdminClient();
    const { error } = id
      ? await admin.from("gastos").update(fila).eq("id", id)
      : await admin.from("gastos").insert(fila);
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/history");
  });
}

/**
 * Apagar o volver a encender un gasto.
 *
 * Al apagar se pide hasta qué día está pagado, porque en SaaS lo normal es
 * cancelar al final del periodo: no te vuelven a cobrar, pero sigues usándolo
 * hasta que se acaba el mes ya pagado. Con esa fecha el estado se deduce solo y
 * no hay que llevar la cuenta a mano.
 */
export async function alternarGasto(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "").trim();
    const apagar = String(formData.get("apagar") ?? "") === "true";
    const pagadoHasta = String(formData.get("pagado_hasta") ?? "").trim();

    if (apagar && !pagadoHasta) {
      throw new Error(
        "Dime hasta qué día está pagado; si no, no se puede saber si aún queda un cobro.",
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("gastos")
      .update({
        activo: !apagar,
        // Al reactivar se limpia: vuelve a estar en curso sin fecha de corte.
        pagado_hasta: apagar ? pagadoHasta : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/history");
  });
}

export async function borrarGasto(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const id = String(formData.get("id") ?? "").trim();
    const admin = createAdminClient();
    const { error } = await admin.from("gastos").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/expenses");
    revalidatePath("/history");
  });
}

/** Tipo de conversión y estado de una oferta. Lo demás lo pone Everflow. */
export async function saveOffer(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const offerId = Number(formData.get("offer_id") ?? 0);
    const raw = String(formData.get("conversion_type") ?? "").trim();
    const active = String(formData.get("active") ?? "") === "true";

    const admin = createAdminClient();
    const { error } = await admin
      .from("offers")
      .update({
        conversion_type: raw === "" ? null : raw,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("offer_id", offerId);
    if (error) throw error;
    revalidatePath("/offers");
  });
}

/**
 * Excluye o vuelve a incluir una cuenta publicitaria de un BM de Facebook.
 * Se lee en cada corrida, así que aplica desde la medición siguiente. El
 * histórico ya guardado no se toca.
 */
export async function toggleExclusionCuenta(
  _previo: string | null,
  formData: FormData,
) {
  return conManejoDeError(async () => {
    const connectionId = String(formData.get("connection_id") ?? "");
    const accountId = String(formData.get("account_id") ?? "");
    const excluida = String(formData.get("excluida") ?? "") === "true";
    if (!connectionId || !accountId) throw new Error("Faltan datos de la cuenta");

    const admin = createAdminClient();
    const { error } = await admin
      .from("fb_ad_accounts")
      .update({ excluida: !excluida, updated_at: new Date().toISOString() })
      .eq("connection_id", connectionId)
      .eq("account_id", accountId);
    if (error) throw error;
    revalidatePath("/bms");
    revalidatePath("/dashboard");
  });
}


/** Botón "Actualizar ahora": dispara una corrida de ingesta manual. */
export async function runIngestNow() {
  await requireUser();
  const result = await runIngest("manual");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/connections");
  revalidatePath("/logs");
  return result;
}
