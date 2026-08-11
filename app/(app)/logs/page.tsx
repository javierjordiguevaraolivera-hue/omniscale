import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/panel";
import { RunNowButton } from "@/components/run-now-button";
import type { DetalleFuente } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";

type Run = {
  id: number;
  started_at: string;
  finished_at: string | null;
  origen: string;
  ok: boolean;
  everflow_rows: number;
  spend_rows: number;
  descartadas: number;
  sin_asignar: number;
  detalle: DetalleFuente[];
  errores: string[];
};

const hora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

const seg = (r: Run) =>
  r.finished_at
    ? `${((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s`
    : "-";

const usd = (n: number) => `$${n.toFixed(2)}`;

const soloHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Una línea por fuente: windsor tiktok:2 $60.78 sync 14:31 */
function resumenFuentes(d: DetalleFuente[]): string {
  return d
    .map((f) => {
      if (f.estado === "error") return `${f.fuente}:ERR`;
      if (f.fuente === "everflow") return `everflow:${f.recibidas}`;
      const ds = Object.entries(f.por_datasource ?? {})
        .map(([k, v]) => {
          const fuera = f.descartados_por_scope?.[k] ?? 0;
          return fuera > 0 ? `${k}:${v}(-${fuera})` : `${k}:${v}`;
        })
        .join(" ");
      const monto = f.gasto !== undefined ? ` ${usd(f.gasto)}` : "";
      // Zernio dice cuándo sincronizó: sirve para medir su frescura real.
      const sync = f.ultima_sync ? ` sync ${soloHora(f.ultima_sync)}` : "";
      // Plataformas pedidas que aún no están conectadas en la fuente.
      const sinCuenta = f.sin_cuenta?.length
        ? ` [sin conectar: ${f.sin_cuenta.join(",")}]`
        : "";
      // Cuentas del BM que se saltaron por estar excluidas.
      const excl = f.cuentas_excluidas
        ? ` [${f.cuentas_excluidas} excluidas]`
        : "";
      return `${ds || f.fuente + ":0"}${monto}${sync}${sinCuenta}${excl}`;
    })
    .join("  ");
}

export default async function LogsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingest_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(200);
  const runs = (data ?? []) as Run[];

  // ¿El gasto que trae Windsor lleva rato sin moverse? Eso es data vieja de
  // Windsor, no un problema de la ingesta.
  const gastos = runs
    .map((r) => r.detalle?.find((d) => d.fuente === "windsor")?.gasto)
    .filter((g): g is number => typeof g === "number");
  const congelado =
    gastos.length >= 5 && new Set(gastos.slice(0, 10).map((g) => g.toFixed(2))).size === 1;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Logs"
        descripcion="Una línea por corrida. Entre paréntesis, las filas que se descartaron."
      >
        <RunNowButton />
      </PageHeader>

      {error && (
        <p className="rounded-lg border border-error bg-error-container px-3 py-2 text-body-md">
          Falta la tabla <code>ingest_runs</code>. Revisa en Ajustes qué
          migraciones están pendientes.
        </p>
      )}

      {congelado && (
        <p className="rounded-lg border border-warning bg-[#fff7f3] px-3 py-2 text-body-md">
          Windsor viene devolviendo el mismo gasto ({usd(gastos[0])}) en las
          últimas corridas. La ingesta funciona; es Windsor el que no ha
          refrescado su data de TikTok.
        </p>
      )}

      {!error && runs.length === 0 && (
        <p className="text-body-md text-on-surface-variant">
          Sin corridas todavía. Pulsa &ldquo;Actualizar ahora&rdquo;.
        </p>
      )}

      {runs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
          <table className="w-full font-mono text-[12px] leading-5">
            <thead className="border-b border-outline-variant bg-surface-container-low">
              <tr className="text-left text-on-surface-variant">
                <th className="px-3 py-1.5 font-semibold">hora</th>
                <th className="px-2 py-1.5 font-semibold">origen</th>
                <th className="px-2 py-1.5 font-semibold">seg</th>
                <th className="px-2 py-1.5 text-right font-semibold">ef</th>
                <th className="px-2 py-1.5 text-right font-semibold">gasto</th>
                <th className="px-3 py-1.5 font-semibold">fuentes</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-outline-variant/30 last:border-0 ${
                    r.ok ? "" : "bg-error-container/40"
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-1 text-on-surface-variant">
                    {hora(r.started_at)}
                  </td>
                  <td className="px-2 py-1 text-on-surface-variant">
                    {r.origen === "manual" ? "manual" : "cron"}
                  </td>
                  <td className="px-2 py-1 text-on-surface-variant">{seg(r)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {r.everflow_rows}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {r.spend_rows}
                    {r.descartadas > 0 && (
                      <span className="text-error">(-{r.descartadas})</span>
                    )}
                  </td>
                  <td className="px-3 py-1">
                    <span className="text-on-surface-variant">
                      {resumenFuentes(r.detalle ?? [])}
                    </span>
                    {r.errores?.length > 0 && (
                      <span className="ml-2 text-error">
                        · {r.errores.join(" · ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {runs.length > 0 && (
        <p className="text-label-sm text-on-surface-variant">
          <strong>ef</strong> = filas de Everflow · <strong>gasto</strong> = filas
          de gasto guardadas · <code>(-n)</code> = descartadas por el scope ·{" "}
          <code>sync</code> = hora en que la fuente dice haber sincronizado ·
          últimas {runs.length} corridas
        </p>
      )}
    </div>
  );
}
