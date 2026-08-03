"use client";

import { useState } from "react";
import { PLATAFORMAS_WINDSOR, SCOPE_WINDSOR_DEFAULT } from "@/lib/scope";

/**
 * Casillas en vez de un input de texto: el autocompletado del navegador ya metió
 * un correo en este campo una vez, y eso descartaba TODO el gasto de Windsor.
 * El valor viaja en un input hidden como lista separada por comas.
 */
export function ScopePicker({
  valorInicial,
  nombre = "scope",
  vistas = [],
}: {
  valorInicial?: string | null;
  nombre?: string;
  /** Datasources que Windsor realmente devolvió, según los logs. */
  vistas?: string[];
}) {
  const inicial = (valorInicial ?? SCOPE_WINDSOR_DEFAULT).trim();
  const todas = inicial === "*";
  const [seleccion, setSeleccion] = useState<Set<string>>(
    new Set(
      todas
        ? []
        : inicial
            .split(/[,\s]+/)
            .map((s) => s.toLowerCase().trim())
            .filter(Boolean),
    ),
  );
  const [aceptarTodas, setAceptarTodas] = useState(todas);

  // Las conocidas + las que Windsor haya devuelto de verdad.
  const opciones = [...new Set([...PLATAFORMAS_WINDSOR, ...vistas])];

  const alternar = (p: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const valor = aceptarTodas ? "*" : [...seleccion].join(",");

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={nombre} value={valor} />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {opciones.map((p) => (
          <label
            key={p}
            className={`flex cursor-pointer items-center gap-2 text-body-md ${
              aceptarTodas ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={aceptarTodas || seleccion.has(p)}
              disabled={aceptarTodas}
              onChange={() => alternar(p)}
              className="accent-brand-crimson"
            />
            {p}
            {vistas.includes(p) && (
              <span className="text-label-sm text-success" title="Windsor la está devolviendo">
                ●
              </span>
            )}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-label-md text-on-surface-variant">
        <input
          type="checkbox"
          checked={aceptarTodas}
          onChange={(e) => setAceptarTodas(e.target.checked)}
          className="accent-brand-crimson"
        />
        Aceptar todas (*) — ojo: duplica el gasto si tienes tokens de Facebook
        activos
      </label>
      {!aceptarTodas && seleccion.size === 0 && (
        <p className="text-label-sm text-error">
          Sin plataformas marcadas no se guardaría ningún gasto de Windsor.
        </p>
      )}
    </div>
  );
}
