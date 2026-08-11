/**
 * Piezas del skeleton que se ve al cambiar de sección en el sidebar.
 *
 * La idea es que el esqueleto tenga la MISMA forma que la pantalla real
 * (encabezado, tarjetas, paneles, tablas) para que al cargar nada salte de
 * sitio. El brillo va de izquierda a derecha en vez de un simple pulso.
 */

const brillo =
  "bg-gradient-to-r from-surface-container via-surface-container-high to-surface-container bg-shimmer animate-shimmer";

export function Bloque({ className = "" }: { className?: string }) {
  return <div className={`rounded-md ${brillo} ${className}`} />;
}

/** Encabezado: título grande, descripción y controles a la derecha. */
export function SkeletonHeader({ conControles = true }: { conControles?: boolean }) {
  return (
    <div className="mb-md flex flex-wrap items-end justify-between gap-md">
      <div className="flex flex-col gap-2">
        <Bloque className="h-8 w-64" />
        <Bloque className="h-4 w-96 max-w-full" />
      </div>
      {conControles && (
        <div className="flex gap-2">
          <Bloque className="h-10 w-40" />
          <Bloque className="h-10 w-44" />
        </div>
      )}
    </div>
  );
}

/** Fila de tarjetas de métrica. */
export function SkeletonTiles({ cuantas = 6 }: { cuantas?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: cuantas }).map((_, i) => (
        <div
          key={i}
          className="min-h-[104px] rounded-lg border border-outline-variant bg-surface-container-lowest p-4"
        >
          <Bloque className="h-3 w-20" />
          <Bloque className="mt-3 h-7 w-24" />
          <Bloque className="mt-2 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Panel con cabecera y un cuerpo de alto configurable. */
export function SkeletonPanel({
  alto = "h-64",
  children,
}: {
  alto?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <Bloque className="h-5 w-52" />
        <Bloque className="h-4 w-24" />
      </div>
      <div className="p-md">{children ?? <Bloque className={`w-full ${alto}`} />}</div>
    </section>
  );
}

// Alturas fijas (no aleatorias) para que servidor y cliente rendericen igual.
const ALTURAS = [
  "h-24", "h-36", "h-20", "h-44", "h-32", "h-40",
  "h-16", "h-48", "h-28", "h-38", "h-20", "h-42",
];

/** Panel con forma de gráfico: barras de alto irregular sobre el eje. */
export function SkeletonChart({ barras = 24 }: { barras?: number }) {
  return (
    <SkeletonPanel>
      <div className="flex h-56 items-end gap-1.5">
        {Array.from({ length: barras }).map((_, i) => (
          <Bloque key={i} className={`flex-1 ${ALTURAS[i % ALTURAS.length]}`} />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bloque key={i} className="h-3 w-10" />
        ))}
      </div>
    </SkeletonPanel>
  );
}

/** Tabla con cabecera y filas. */
export function SkeletonTable({
  columnas = 5,
  filas = 8,
}: {
  columnas?: number;
  filas?: number;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <Bloque className="h-5 w-56" />
        <Bloque className="h-4 w-28" />
      </div>
      <div className="divide-y divide-outline-variant/40">
        <div className="flex gap-4 bg-surface-bright px-3 py-2">
          {Array.from({ length: columnas }).map((_, i) => (
            <Bloque key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: filas }).map((_, f) => (
          <div key={f} className="flex gap-4 px-3 py-3">
            {Array.from({ length: columnas }).map((_, c) => (
              <Bloque key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-outline-variant bg-surface-container-low px-md py-sm">
        <Bloque className="h-3 w-24" />
      </div>
    </section>
  );
}
