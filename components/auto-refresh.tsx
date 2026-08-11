"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

/**
 * Recarga la data del panel sin recargar la página.
 *
 * Las páginas son server components: se renderizan frescas en cada petición,
 * pero el navegador no vuelve a pedirlas solo. `router.refresh()` re-ejecuta el
 * servidor y sustituye la data manteniendo el scroll y el estado de la UI, así
 * que no hace falta darle a "Actualizar".
 *
 * Cuando la pestaña está oculta no refresca (no sirve de nada), y al volver a
 * ella refresca de inmediato para que nunca se vea data vieja.
 */
export function AutoRefresh({ segundos = 120 }: { segundos?: number }) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  const [ultima, setUltima] = useState<number | null>(null);
  const [hace, setHace] = useState(0);

  const refrescar = useCallback(() => {
    start(() => {
      router.refresh();
      setUltima(Date.now());
    });
  }, [router]);

  // Ciclo de refresco
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refrescar();
    }, segundos * 1000);
    return () => window.clearInterval(id);
  }, [refrescar, segundos]);

  // Al volver a la pestaña, ponerse al día al instante
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [refrescar]);

  // Contador de "hace X" (solo texto, no dispara peticiones)
  useEffect(() => {
    const id = window.setInterval(() => {
      setHace(ultima ? Math.round((Date.now() - ultima) / 1000) : 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [ultima]);

  const texto = pendiente
    ? "actualizando…"
    : ultima === null
      ? `en vivo · cada ${segundos / 60} min`
      : hace < 5
        ? "actualizado ahora"
        : `actualizado hace ${hace < 60 ? `${hace}s` : `${Math.round(hace / 60)} min`}`;

  return (
    <button
      type="button"
      onClick={refrescar}
      title="Se actualiza solo. Púlsalo para hacerlo ya."
      className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-label-sm text-on-surface-variant transition-colors hover:text-brand"
    >
      <span className="relative flex h-2 w-2">
        {!pendiente && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${pendiente ? "bg-brand-crimson" : "bg-success"}`}
        />
      </span>
      {texto}
      <RefreshCw className={`h-3 w-3 ${pendiente ? "animate-spin" : ""}`} />
    </button>
  );
}
