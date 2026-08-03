"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { runIngestNow } from "@/app/actions";

export function RunNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-label-sm text-on-surface-variant">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await runIngestNow();
              setMsg(
                r.ok
                  ? `Listo · ${r.everflow_rows} filas Everflow · ${r.fb_accounts} cuentas`
                  : `Con errores: ${r.errors.join(" | ").slice(0, 160)}`,
              );
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Error");
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
