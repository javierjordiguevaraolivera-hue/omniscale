export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export const num = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

/**
 * Normaliza a un nombre de plataforma único. Sirve para los dos lados: el
 * `source_id` de Everflow y el `datasource` de Windsor, que escriben distinto
 * la misma plataforma. Devuelve null si no reconoce nada.
 */
export function normalizarPlataforma(valor: string): string | null {
  const s = (valor ?? "").toLowerCase().trim();
  if (!s || s === "unknown" || s === "null" || s === "none") return null;
  if (s.includes("facebook") || s.includes("meta") || s === "fb") return "Facebook";
  if (s.includes("tiktok") || s === "tt") return "TikTok";
  if (s.includes("google") || s.includes("adwords") || s === "goog") return "Google";
  if (s.includes("snapchat") || s === "snap") return "Snapchat";
  if (s.includes("linkedin")) return "LinkedIn";
  if (s.includes("bing") || s.includes("microsoft")) return "Microsoft";
  if (s.includes("taboola")) return "Taboola";
  if (s.includes("outbrain")) return "Outbrain";
  return null;
}

const SIN_DATO = new Set(["", "unknown", "null", "none"]);

/** Etiqueta amigable para el source_id que manda Everflow. */
export function sourceLabel(sourceId: string): string {
  const conocida = normalizarPlataforma(sourceId);
  if (conocida) return conocida;
  const raw = (sourceId ?? "").trim();
  return SIN_DATO.has(raw.toLowerCase()) ? "Desconocido" : raw;
}

/** Etiqueta amigable para el datasource que manda Windsor. */
export function platformLabel(datasource: string): string {
  return (
    normalizarPlataforma(datasource) ??
    (datasource ? datasource[0].toUpperCase() + datasource.slice(1) : "—")
  );
}
