"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

/** Refrescos más seguidos que esto se ignoran (cambiar de pestaña rápido). */
const MIN_ENTRE_REFRESCOS = 8_000;

/**
 * Recarga la data del panel sin recargar la página.
 *
 * Las páginas son server components: se renderizan frescas en cada petición,
 * pero el navegador no vuelve a pedirlas solo. `router.refresh()` re-ejecuta el
 * servidor y sustituye la data manteniendo el scroll y el estado de la UI, así
 * que no hace falta darle a "Actualizar".
 *
 * Refresca **también con la pestaña oculta**, a propósito: si no, al volver a
 * ella se ven los números de hace rato hasta que termina el refresco. El
 * navegador frena los timers en segundo plano (Chrome los baja a ~1 por minuto
 * y puede congelarlos del todo tras unos minutos), así que eso solo no alcanza:
 * al volver también se refresca, y mientras tanto se avisa de que lo que hay en
 * pantalla es viejo, para no dar un número atrasado por actual.
 */
export function AutoRefresh({ segundos = 120 }: { segundos?: number }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [ultima, setUltima] = useState<number | null>(null);
  const [hace, setHace] = useState(0);
  // En ref además del estado: hace falta leerlo sin re-crear el callback.
  const ultimaRef = useRef(0);

  const refrescar = useCallback((deduplicar = false) => {
    if (deduplicar && Date.now() - ultimaRef.current < MIN_ENTRE_REFRESCOS) return;
    ultimaRef.current = Date.now();
    start(() => {
      router.refresh();
      setUltima(Date.now());
    });
  }, [router]);

  // Ciclo de refresco: corre esté visible la pestaña o no.
  useEffect(() => {
    const id = window.setInterval(() => refrescar(), segundos * 1000);
    return () => window.clearInterval(id);
  }, [refrescar, segundos]);

  // Al volver a la pestaña, ponerse al día al instante.
  // `focus` cubre los casos en que `visibilitychange` no dispara (cambiar de
  // ventana en vez de pestaña); el deduplicado evita pedir dos veces.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar(true);
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [refrescar]);

  // Contador de "hace X" (solo texto, no dispara peticiones)
  useEffect(() => {
    const id = window.setInterval(() => {
      setHace(ultima ? Math.round((Date.now() - ultima) / 1000) : 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [ultima]);

  const enTexto = (s: number) =>
    s < 60 ? `${s}s` : `${Math.round(s / 60)} min`;

  // Se pasó del ciclo: el navegador frenó los timers estando oculta.
  const vieja = ultima !== null && hace > segundos + 15;

  const texto = pendiente
    ? vieja
      ? `data de hace ${enTexto(hace)} · actualizando…`
      : "actualizando…"
    : ultima === null
      ? `en vivo · cada ${segundos / 60} min`
      : vieja
        ? `data de hace ${enTexto(hace)}`
        : hace < 5
          ? "actualizado ahora"
          : `actualizado hace ${enTexto(hace)}`;

  return (
    <button
      type="button"
      onClick={() => refrescar()}
      title="Se actualiza solo, incluso con la pestaña en segundo plano. Púlsalo para hacerlo ya."
      className={`flex items-center gap-2 rounded-full border bg-surface-container-lowest px-3 py-1 text-label-sm transition-colors hover:text-brand ${
        vieja
          ? "border-warning text-warning"
          : "border-outline-variant text-on-surface-variant"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {!pendiente && !vieja && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            pendiente
              ? "bg-brand-crimson"
              : vieja
                ? "bg-warning"
                : "bg-success"
          }`}
        />
      </span>
      {texto}
      <RefreshCw className={`h-3 w-3 ${pendiente ? "animate-spin" : ""}`} />
    </button>
  );
}
