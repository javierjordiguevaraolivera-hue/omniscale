/** Plataformas que aporta Windsor si la conexión no dice otra cosa. */
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

/** Un término de scope válido: solo letras, números, guion y guion bajo. */
const TERMINO_VALIDO = /^[a-z0-9_-]{2,40}$/;

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
