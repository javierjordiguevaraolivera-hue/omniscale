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
 * Plataformas que reconocemos, con las dos escrituras que hay que aceptar: el
 * `source_id` de Everflow ("Facebook Ads", "YouTube Ads") y el `datasource` de
 * Windsor ("facebook", "tiktok").
 *
 * YouTube va SEPARADO de Google a propósito: técnicamente una campaña de
 * YouTube es una campaña de Google Ads, pero como fuente de tráfico no se
 * parecen — aquí casi no se corre búsqueda ni shopping, siempre vídeo — y se
 * miden aparte. El orden importa: YouTube antes que Google.
 */
const PLATAFORMAS: {
  clave: string;
  label: string;
  contiene: string[];
  exactas: string[];
}[] = [
  { clave: "facebook", label: "Facebook", contiene: ["facebook", "meta"], exactas: ["fb"] },
  { clave: "tiktok", label: "TikTok", contiene: ["tiktok"], exactas: ["tt"] },
  { clave: "youtube", label: "YouTube", contiene: ["youtube"], exactas: ["yt"] },
  { clave: "google", label: "Google", contiene: ["google", "adwords"], exactas: ["goog"] },
  { clave: "taboola", label: "Taboola", contiene: ["taboola"], exactas: [] },
  { clave: "snapchat", label: "Snapchat", contiene: ["snapchat"], exactas: ["snap"] },
  { clave: "linkedin", label: "LinkedIn", contiene: ["linkedin"], exactas: [] },
  { clave: "bing", label: "Microsoft", contiene: ["bing", "microsoft"], exactas: [] },
  { clave: "outbrain", label: "Outbrain", contiene: ["outbrain"], exactas: [] },
];

/**
 * Plataformas de las que ya llega revenue pero todavía no hay de dónde sacar el
 * gasto. Salen con gasto $0, y eso hay que decirlo en pantalla en vez de
 * disimularlo: un $0 sin explicación se lee como que no gastaste.
 */
export const SIN_FUENTE_DE_GASTO = new Set(["youtube", "taboola"]);

/**
 * Valores que significan "no hay dato". `N/A` es el que usa Everflow cuando la
 * conversión llegó sin el parámetro (verificado contra la API el 2026-08-12).
 */
const SIN_DATO = new Set(["", "n/a", "na", "unknown", "null", "none", "-"]);

export const esSinDato = (v: string) => SIN_DATO.has((v ?? "").toLowerCase().trim());

/** Clave interna de la plataforma (minúsculas). null si no reconoce nada. */
export function clavePlataforma(valor: string): string | null {
  const s = (valor ?? "").toLowerCase().trim();
  if (esSinDato(s)) return null;
  for (const p of PLATAFORMAS) {
    if (p.exactas.includes(s)) return p.clave;
    if (p.contiene.some((c) => s.includes(c))) return p.clave;
  }
  return null;
}

/** Nombre de plataforma para mostrar. null si no reconoce nada. */
export function normalizarPlataforma(valor: string): string | null {
  const clave = clavePlataforma(valor);
  return PLATAFORMAS.find((p) => p.clave === clave)?.label ?? null;
}

/**
 * ¿El `sub1` de Everflow es un account ID de verdad?
 *
 * Solo si son puros dígitos. Las campañas viejas mandan ahí el nombre de la
 * campaña, con guiones y espacios; hasta que se cambien hay que ignorarlas en
 * vez de inventar una cuenta. Su revenue sigue contando por oferta, solo que no
 * se puede repartir por cuenta.
 */
export function esAccountId(sub1: string): boolean {
  return /^\d+$/.test((sub1 ?? "").trim());
}

/** Etiqueta amigable para el source_id que manda Everflow. */
export function sourceLabel(sourceId: string): string {
  const conocida = normalizarPlataforma(sourceId);
  if (conocida) return conocida;
  const raw = (sourceId ?? "").trim();
  return esSinDato(raw) ? "Desconocido" : raw;
}

/** Etiqueta amigable para el datasource que manda Windsor. */
export function platformLabel(datasource: string): string {
  return (
    normalizarPlataforma(datasource) ??
    (datasource ? datasource[0].toUpperCase() + datasource.slice(1) : "—")
  );
}
