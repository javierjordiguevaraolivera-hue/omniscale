"use client";

import { useEffect } from "react";

/**
 * Registra el service worker. Sin él el navegador no ofrece instalar la app.
 *
 * El worker no cachea data ni páginas (ver public/sw.js), así que registrarlo
 * también en local es inofensivo y permite probar la instalación de verdad.
 */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const alCargar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        // No es fatal: la app funciona igual, solo no se puede instalar.
        console.warn("[pwa] no se pudo registrar el service worker", e);
      });
    };
    // Después del load: registrarlo antes compite con la carga de la página.
    if (document.readyState === "complete") alCargar();
    else window.addEventListener("load", alCargar, { once: true });
    return () => window.removeEventListener("load", alCargar);
  }, []);

  return null;
}
