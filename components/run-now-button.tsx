"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { runIngestNow } from "@/app/actions";
import { mensajeDeError } from "@/lib/errores";

export function RunNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [esError, setEsError] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span
          className={`max-w-md text-label-sm ${esError ? "text-error" : "text-on-surface-variant"}`}
        >
          {msg}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await runIngestNow();
              setEsError(!r.ok);
              setMsg(
                r.ok
                  ? `Listo · ${r.everflow_rows} filas Everflow · ${r.spend_rows} de gasto` +
                    (r.sin_asignar > 0 ? ` · ${r.sin_asignar} sin oferta` : "")
                  : mensajeDeError(r.errors[0] ?? "Error desconocido"),
              );
            } catch (e) {
              setEsError(true);
              setMsg(mensajeDeError(e));
            }
          })
        }
        className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-brand disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Actualizando..." : "Actualizar ahora"}
      </button>
    </div>
  );
}
