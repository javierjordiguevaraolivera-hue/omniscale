import { Panel } from "@/components/panel";

export type Columna<Row> = {
  key: string;
  label: string;
  /** Alinea a la derecha (números) o al centro. */
  align?: "right" | "center";
  render: (row: Row) => React.ReactNode;
};

/**
 * Tabla del panel: cabecera sticky, scroll interno, filas de 40px con hover y
 * pie con el conteo. Mismo estilo que las tablas de EcomfyCalls v2.
 */
export function DataTable<Row>({
  titulo,
  icono,
  columnas,
  filas,
  rowKey,
  vacio,
  sustantivo,
  acciones,
  alto = "max-h-[520px]",
}: {
  titulo: string;
  /** Elemento ya creado: icono={<Layers className="h-5 w-5" />} */
  icono?: React.ReactNode;
  columnas: Columna<Row>[];
  filas: Row[];
  rowKey: (row: Row) => string;
  vacio: string;
  sustantivo: string;
  acciones?: React.ReactNode;
  alto?: string;
}) {
  const alineacion = (a?: "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "";

  return (
    <Panel titulo={titulo} icono={icono} acciones={acciones}>
      <div className={`min-h-0 overflow-auto ${alto}`}>
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 border-b border-outline-variant bg-surface-bright">
            <tr>
              {columnas.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap bg-surface-bright px-3 py-2 text-label-md text-on-surface-variant ${alineacion(c.align)}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {filas.length === 0 ? (
              <tr className="h-[40px]">
                <td
                  colSpan={columnas.length}
                  className="px-md py-lg text-center text-body-md text-on-surface-variant"
                >
                  {vacio}
                </td>
              </tr>
            ) : (
              filas.map((f) => (
                <tr
                  key={rowKey(f)}
                  className="h-[40px] transition-colors hover:bg-surface-container-low"
                >
                  {columnas.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-xs text-body-md ${alineacion(c.align)}`}
                    >
                      {c.render(f)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="shrink-0 border-t border-outline-variant bg-surface-container-low px-md py-sm text-label-sm text-on-surface-variant">
        {filas.length} {sustantivo}
      </div>
    </Panel>
  );
}
