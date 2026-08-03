"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runIngest } from "@/lib/ingest/run";

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
  if (!["everflow", "facebook", "tiktok", "google"].includes(platform) || !apiKey) {
    throw new Error("Datos incompletos");
  }
  const admin = createAdminClient();
  const { error } = await admin.from("connections").insert({
    platform,
    label: label || platform,
    api_key: apiKey,
  });
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

/** Asignación manual de oferta a una cuenta (solo afecta snapshots futuros). */
export async function assignOffer(formData: FormData) {
  await requireUser();
  const accountId = String(formData.get("account_id") ?? "");
  const raw = String(formData.get("offer_id") ?? "");
  const offerId = raw === "" ? null : Number(raw);
  const admin = createAdminClient();
  const { error } = await admin
    .from("ad_accounts")
    .update({
      offer_id: offerId,
      auto_mapped: false,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

/** Botón "Ejecutar ahora": dispara una corrida de ingesta manual. */
export async function runIngestNow() {
  await requireUser();
  const result = await runIngest();
  revalidatePath("/dashboard");
  revalidatePath("/connections");
  return result;
}
