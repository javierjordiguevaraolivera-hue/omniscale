export type OrigenMapeo =
  | "oid-campana"
  | "oid-cuenta"
  | "numero-campana"
  | "numero-cuenta"
  | "manual"
  | "sin-configurar";

/** Busca `oid_1234` (también oid-1234, oid 1234, OID1234). */
function oid(texto: string): number | null {
  const m = /oid[_\s-]?(\d{2,7})/i.exec(texto);
  return m ? Number(m[1]) : null;
}

/** Números "sueltos" del texto, de derecha a izquierda (el sufijo manda). */
function numeros(texto: string): number[] {
  const encontrados = [...texto.matchAll(/\b(\d{3,7})\b/g)].map((m) => Number(m[1]));
  return encontrados.reverse();
}

/**
 * Resuelve la oferta de una fila de gasto por orden de prioridad:
 *  1. `oid_XXXX` en el nombre de la campaña  (lo más explícito y específico)
 *  2. `oid_XXXX` en el nombre de la cuenta
 *  3. un número de la campaña que sea una oferta conocida en Everflow
 *  4. un número de la cuenta que sea una oferta conocida en Everflow
 *
 * Exigir que el número exista en `offers` evita confundir un correlativo de la
 * cuenta (p. ej. "M.S-T.I#41 - AM - 3876") con un ID de oferta real.
 */
export function resolverOferta(
  accountName: string,
  campaign: string,
  ofertasConocidas: Set<number>,
): { offerId: number | null; origen: OrigenMapeo } {
  const oidCampana = oid(campaign);
  if (oidCampana !== null) return { offerId: oidCampana, origen: "oid-campana" };

  const oidCuenta = oid(accountName);
  if (oidCuenta !== null) return { offerId: oidCuenta, origen: "oid-cuenta" };

  for (const n of numeros(campaign)) {
    if (ofertasConocidas.has(n)) return { offerId: n, origen: "numero-campana" };
  }
  for (const n of numeros(accountName)) {
    if (ofertasConocidas.has(n)) return { offerId: n, origen: "numero-cuenta" };
  }

  return { offerId: null, origen: "sin-configurar" };
}
