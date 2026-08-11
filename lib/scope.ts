/**
 * Plataformas que aporta Windsor si la conexión no dice otra cosa.
 * Facebook NO está: entra por lógica propia (Graph API, un token por BM). Si se
 * marcara aquí también, el gasto se contaría dos veces.
 */
export const SCOPE_WINDSOR_DEFAULT = "tiktok,google";

/** Plataformas que ofrecemos como opción en la pantalla de Conexiones. */
export const PLATAFORMAS_WINDSOR = [
  "tiktok",
  "google",
  "facebook",
  "snapchat",
  "bing",
  "linkedin",
  "taboola",
  "outbrain",
] as const;

/**
 * Nombre corto -> endpoint real de Windsor. Se llama un endpoint por
 * plataforma (`/facebook`, `/tiktok`, `/google_ads`), no `/all`: así nunca se
 * descarta gasto en silencio por un filtro mal puesto.
 * Verificado 2026-08-10: `/google` y `/googleads` responden "We don't have this
 * connector yet!"; el correcto es `/google_ads`.
 */
const ENDPOINTS: Record<string, string> = {
  facebook: "facebook",
  tiktok: "tiktok",
  google: "google_ads",
  google_ads: "google_ads",
  snapchat: "snapchat",
  bing: "bing",
  linkedin: "linkedin",
  taboola: "taboola",
  outbrain: "outbrain",
};

export function endpointDeWindsor(plataforma: string): string {
  const p = plataforma.toLowerCase().trim();
  return ENDPOINTS[p] ?? p;
}

/** Un término de scope válido: solo letras, números, guion y guion bajo. */
const TERMINO_VALIDO = /^[a-z0-9_-]{2,40}$/;

/**
 * Intervalos de refresco que acepta Windsor.
 *
 * Vacío = no mandar el parámetro. Es lo único que funciona en Free, Trial y
 * **Basic**: verificado 2026-08-10 que en plan BASIC la API responde HTTP 403
 * "Hourly data is not available for BASIC subscription plan" con cualquier
 * valor, incluso 1h. Standard y Plus admiten 1h o más; Professional y
 * Enterprise, 15min o más.
 */
export const REFRESH_INTERVALS = [
  { valor: "", label: "Por defecto del plan (única opción en Free/Trial/Basic)" },
  { valor: "6h", label: "6 horas — requiere Standard o superior" },
  { valor: "1h", label: "1 hora — requiere Standard o superior" },
  { valor: "30min", label: "30 minutos — requiere Professional" },
  { valor: "15min", label: "15 minutos — requiere Professional" },
] as const;

const INTERVALOS_VALIDOS = new Set(REFRESH_INTERVALS.map((r) => r.valor));

export function esRefreshIntervalValido(v: string): boolean {
  return INTERVALOS_VALIDOS.has(v.trim() as (typeof REFRESH_INTERVALS)[number]["valor"]);
}

/**
 * Limpia el scope escrito por el usuario. Descarta lo que no puede ser el
 * nombre de una plataforma (correos autocompletados por el navegador, texto con
 * espacios, etc.) y devuelve también qué se descartó para poder avisar.
 */
export function sanearScope(raw: string): {
  scope: string;
  invalidos: string[];
} {
  const texto = (raw ?? "").trim();
  if (texto === "*") return { scope: "*", invalidos: [] };

  const terminos = texto
    .split(/[,;\s]+/)
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);

  const validos: string[] = [];
  const invalidos: string[] = [];
  for (const t of terminos) {
    if (TERMINO_VALIDO.test(t)) validos.push(t);
    else invalidos.push(t);
  }

  return {
    scope: [...new Set(validos)].join(","),
    invalidos,
  };
}

/**
 * Lista de plataformas permitidas para una conexión de Windsor.
 * null = acepta todas ("*"). Si el scope guardado quedó vacío o con basura, se
 * cae al valor por defecto en vez de descartar todo el gasto.
 */
export function scopePermitido(scopeGuardado: string | null): string[] | null {
  const { scope } = sanearScope(scopeGuardado ?? "");
  if (scope === "*") return null;
  return (scope || SCOPE_WINDSOR_DEFAULT).split(",").filter(Boolean);
}

/**
 * Comparación tolerante: Windsor nombra sus fuentes de varias formas
 * ("google_ads", "facebook_ads"…), así que basta con que el término del scope
 * esté contenido en el datasource. Escribir "google" también acepta
 * "google_ads" — si fuera comparación exacta, ese gasto se perdería.
 */
export function datasourcePermitido(
  datasource: string,
  permitidas: string[] | null,
): boolean {
  if (permitidas === null) return true;
  const d = (datasource ?? "").toLowerCase();
  return permitidas.some((p) => d === p || d.includes(p) || p.includes(d));
}
