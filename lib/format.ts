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

/** Etiqueta amigable para el source_id que manda Everflow. */
export function sourceLabel(sourceId: string): string {
  const s = (sourceId ?? "").toLowerCase().trim();
  if (!s || s === "unknown" || s === "null") return "Desconocido";
  if (s.includes("facebook") || s === "fb" || s === "meta") return "Facebook";
  if (s.includes("tiktok") || s === "tt") return "TikTok";
  if (s.includes("google") || s === "goog" || s === "adwords") return "Google";
  return sourceId;
}
