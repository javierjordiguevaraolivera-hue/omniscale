import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión · OMNI Scale" };

/**
 * La sirve el service worker cuando no hay red. No muestra ningún número a
 * propósito: mostrar data guardada sin conexión es exactamente cómo se llega a
 * tomar una decisión con cifras viejas.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bright p-6">
      <div className="max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg text-center">
        <WifiOff className="mx-auto h-10 w-10 text-on-surface-variant" />
        <h1 className="mt-md text-headline-sm text-brand">Sin conexión</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          No hay internet, así que no se pueden leer los números de ahora. La
          medición sigue corriendo en el servidor cada 2 minutos: cuando vuelva la
          señal, no falta nada.
        </p>
        <p className="mt-md text-label-sm text-on-surface-variant">
          Reintenta cuando tengas red.
        </p>
      </div>
    </div>
  );
}
