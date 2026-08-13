/*
 * Service worker de OMNI Scale.
 *
 * DELIBERADAMENTE NO CACHEA DATOS NI PÁGINAS.
 *
 * Todo este panel existe para mirar números frescos: el cron mide cada 2
 * minutos y el frontend se recarga solo. Un service worker que sirviera HTML o
 * respuestas de API desde caché mostraría gasto y revenue viejos sin avisar, que
 * es justo el problema que se arregló en el auto-refresh. Así que aquí:
 *
 *   - las navegaciones van SIEMPRE a la red; si no hay red, se muestra /offline;
 *   - todo lo demás (API, auth, chunks, imágenes) no se toca: pasa directo.
 *
 * Lo único que se guarda es la página de "sin conexión" y los iconos, para poder
 * mostrar algo cuando no haya señal. Su presencia también es lo que hace que el
 * navegador ofrezca instalar la app.
 */

const VERSION = "omni-v1";
const ESENCIALES = ["/offline", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      // Si alguno falla no se aborta la instalación: la app funciona igual, solo
      // se queda sin pantalla de sin-conexión.
      .then((cache) => Promise.allSettled(ESENCIALES.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Solo las navegaciones. Cualquier otra cosa se deja pasar sin tocar, para no
  // interferir con la data, con la sesión de Supabase ni con el HMR en local.
  if (req.mode !== "navigate" || req.method !== "GET") return;

  evento.respondWith(
    // Red siempre. El caché no participa salvo que no haya conexión.
    fetch(req).catch(async () => {
      const cache = await caches.open(VERSION);
      return (
        (await cache.match("/offline")) ??
        new Response("Sin conexión.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
