"use client";

import { useState } from "react";
import {
  PLATAFORMAS_WINDSOR,
  REFRESH_INTERVALS,
  SCOPE_WINDSOR_DEFAULT,
} from "@/lib/scope";

/**
 * Casillas en vez de un input de texto: el autocompletado del navegador ya metió
 * un correo en este campo una vez, y eso descartaba TODO el gasto de Windsor.
 * El valor viaja en un input hidden como lista separada por comas.
 */
export function ScopePicker({
  valorInicial,
  nombre = "scope",
  vistas = [],
  refreshInicial,
  conRefresh = true,
}: {
  valorInicial?: string | null;
  nombre?: string;
  /** Datasources que la fuente realmente devolvió, según los logs. */
  vistas?: string[];
  refreshInicial?: string | null;
  /** El intervalo de refresco solo existe en Windsor. */
  conRefresh?: boolean;
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

      {conRefresh && (
      <label className="mt-1 grid gap-1">
        <span className="text-label-md text-on-surface-variant">
          Intervalo de refresco de Windsor
        </span>
        <select
          name="refresh_interval"
          defaultValue={refreshInicial ?? ""}
          className="h-9 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
        >
          {REFRESH_INTERVALS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.label}
            </option>
          ))}
        </select>
        <span className="text-label-sm text-on-surface-variant">
          Cada cuánto Windsor vuelve a pedirle los datos a la plataforma de
          origen. Si tu plan no lo admite, Windsor responde con error y lo verás
          en Logs.
        </span>
      </label>
      )}
    </div>
  );
}
