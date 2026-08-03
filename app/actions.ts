"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runIngest, SCOPE_WINDSOR_DEFAULT } from "@/lib/ingest/run";

/** Todas las acciones exigen sesión iniciada. */
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("No autorizado");
}

export async function addConnection(formData: FormData) {
  await requireUser();
  const platform = String(formData.get("platform") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const apiKey = String(formData.get("api_key") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  if (!["everflow", "facebook", "windsor"].includes(platform) || !apiKey) {
    throw new Error("Datos incompletos");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("connections").insert({
    platform,
    label: label || platform,
    api_key: apiKey,
    scope: platform === "windsor" ? scope || SCOPE_WINDSOR_DEFAULT : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/connections");
}

/** Ajusta las plataformas que aporta una conexión de Windsor. */
export async function updateScope(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const scope =
    String(formData.get("scope") ?? "").trim() || SCOPE_WINDSOR_DEFAULT;
  const admin = createAdminClient();
  const { error } = await admin.from("connections").update({ scope }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/connections");
}

export async function deleteConnection(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  const { error } = await admin.from("connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/connections");
}

export async function toggleConnection(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  const admin = createAdminClient();
  const { error } = await admin
    .from("connections")
    .update({ active: !active })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/connections");
}

export async function updateSettings(formData: FormData) {
  await requireUser();
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
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/**
 * Asignación manual de oferta a una combinación plataforma × cuenta × campaña.
 * Solo afecta las capturas futuras: el histórico ya guardado no se toca.
 */
export async function assignOffer(formData: FormData) {
  await requireUser();
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
  if (error) throw new Error(error.message);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

/** Botón "Actualizar ahora": dispara una corrida de ingesta manual. */
export async function runIngestNow() {
  await requireUser();
  const result = await runIngest();
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/connections");
  return result;
}
