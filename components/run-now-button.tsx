"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runIngestNow } from "@/app/actions";

export function RunNowButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await runIngestNow();
              setMsg(
                r.ok
                  ? `Listo · ${r.everflow_rows} filas Everflow · ${r.fb_accounts} cuentas`
                  : `Con errores: ${r.errors.join(" | ").slice(0, 200)}`,
              );
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Error");
            }
          })
        }
      >
        {pending ? "Ejecutando..." : "Actualizar ahora"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
