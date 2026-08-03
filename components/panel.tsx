// Presentacionales puros. `icono` recibe el ELEMENTO ya creado
// (icono={<Activity />}), no el componente: una referencia a componente no
// se puede serializar al cruzar de un server component a uno de cliente.

/** Encabezado de sección: título + descripción + controles a la derecha. */
export function PageHeader({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-md flex flex-wrap items-end justify-between gap-md">
      <div>
        <h2 className="text-headline-lg text-brand">{titulo}</h2>
        {descripcion && (
          <p className="max-w-3xl text-body-md text-on-surface-variant">
            {descripcion}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-sm">{children}</div>
      )}
    </div>
  );
}

/** Tarjeta con cabecera, igual a las secciones de EcomfyCalls v2. */
export function Panel({
  titulo,
  icono,
  acciones,
  children,
  className,
}: {
  titulo: string;
  icono?: React.ReactNode;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-md border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="flex shrink-0 items-center gap-2 text-headline-sm text-brand">
          {icono} {titulo}
        </h3>
        {acciones && (
          <div className="flex flex-wrap items-center gap-sm">{acciones}</div>
        )}
      </div>
      {children}
    </section>
  );
}
