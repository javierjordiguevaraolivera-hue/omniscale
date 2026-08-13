import type { MetadataRoute } from "next";

/**
 * Manifest de la web app. Next lo sirve en /manifest.webmanifest.
 *
 * Con esto el navegador ofrece "Instalar" en PC y "Agregar a inicio" en móvil y
 * tablet, y la app abre sin barra de direcciones (`display: standalone`).
 *
 * `start_url` va al panel y no a la landing: si ya está instalada, quien la abre
 * es Antony, que va directo a ver los números.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OMNI Scale · Reporte de campañas",
    short_name: "OMNI Scale",
    description:
      "Gasto, conversiones, revenue y profit por oferta y plataforma, actualizado cada 2 minutos.",
    lang: "es",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    // En tablet se usa horizontal y en teléfono vertical, así que no se fija.
    orientation: "any",
    background_color: "#f7f9fc",
    theme_color: "#16243d",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Android recorta el icono en círculo o squircle según el launcher. El
        // emblema va al 60% dentro de la zona segura para que no se corte.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Panel de hoy", url: "/dashboard" },
      { name: "Histórico", url: "/history" },
      { name: "Gastos", url: "/expenses" },
    ],
  };
}
