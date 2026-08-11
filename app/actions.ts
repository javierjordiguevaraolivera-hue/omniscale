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
    const everflowTzId = Number(formData.get("everflow_timezone_id") ?? 67);
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
 * Solo afecta las capturas futuras: el histórico ya guardado no se toca.
 */
export async function assignOffer(_previo: string | null, formData: FormData) {
  return conManejoDeError(async () => {
    const datasource = String(formData.get("datasource") ?? "");
    const accountName = String(formData.get("account_name") ?? "");
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
      .eq("account_name", accountName)
      .eq("campaign", campaign);
    if (error) throw error;
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
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
