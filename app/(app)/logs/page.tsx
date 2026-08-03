import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/panel";
import { RunNowButton } from "@/components/run-now-button";
import { num } from "@/lib/format";
import type { DetalleFuente } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";

type Run = {
  id: number;
  started_at: string;
  finished_at: string | null;
  day: string | null;
  origen: string;
  ok: boolean;
  everflow_rows: number;
  spend_rows: number;
  descartadas: number;
  sin_asignar: number;
  detalle: DetalleFuente[];
  errores: string[];
};

function hora(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function duracion(r: Run) {
  if (!r.finished_at) return "—";
  const ms = new Date(r.finished_at).getTime() - new Date(r.started_at).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
}

const chip = "rounded-md px-1.5 py-0.5 text-label-sm";

export default async function LogsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingest_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(60);
  const runs = (data ?? []) as Run[];

  const conErrores = runs.filter((r) => !r.ok).length;
  const ultimaOk = runs.find((r) => r.ok);

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Logs de ingesta"
        descripcion="Cada corrida del cron y cada 'Actualizar ahora': qué pidió a cada fuente, cuántas filas llegaron, cuántas se guardaron y cuántas se descartaron."
      >
        <RunNowButton />
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-error bg-error-container p-md text-body-md">
          <p className="font-semibold text-on-surface">
            No se pudo leer la bitácora
          </p>
          <p className="mt-1 text-on-surface-variant">
            Falta la tabla <code>ingest_runs</code>. Ejecuta{" "}
            <code>supabase/schema.sql</code> completo en el SQL Editor de Supabase.
          </p>
        </div>
      )}

      {!error && runs.length === 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-body-md">
          <p className="font-semibold text-on-surface">Sin corridas registradas</p>
          <p className="mt-1 text-on-surface-variant">
            Pulsa &ldquo;Actualizar ahora&rdquo; para lanzar una y ver el detalle
            aquí.
          </p>
        </div>
      )}

      {runs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Resumen label="Corridas registradas" valor={String(runs.length)} />
          <Resumen
            label="Con errores"
            valor={String(conErrores)}
            tone={conErrores > 0 ? "bad" : "good"}
          />
          <Resumen
            label="Última correcta"
            valor={ultimaOk ? hora(ultimaOk.started_at) : "—"}
          />
          <Resumen
            label="Filas descartadas (últimas 60)"
            valor={num(runs.reduce((a, r) => a + r.descartadas, 0))}
            tone={runs.some((r) => r.descartadas > 0) ? "bad" : "neutral"}
          />
        </div>
      )}

      {runs.map((r) => (
        <Panel
          key={r.id}
          titulo={`${hora(r.started_at)} · ${r.origen === "manual" ? "manual" : "cron"}`}
          icono={
            r.ok ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-error" />
            )
          }
          acciones={
            <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
              <span>día {r.day ?? "—"}</span>
              <span>·</span>
              <span>{duracion(r)}</span>
              <span>·</span>
              <span>Everflow {num(r.everflow_rows)}</span>
              <span>·</span>
              <span>gasto {num(r.spend_rows)}</span>
              {r.descartadas > 0 && (
                <span className="font-semibold text-error">
                  · {num(r.descartadas)} descartadas
                </span>
              )}
              {r.sin_asignar > 0 && (
                <span className="text-warning">
                  · {num(r.sin_asignar)} sin oferta
                </span>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-md p-md">
            {r.errores.length > 0 && (
              <ul className="flex flex-col gap-1">
                {r.errores.map((e, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-error bg-error-container px-3 py-2 text-body-md text-on-surface"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant">
                  <tr>
                    {[
                      "Fuente",
                      "Estado",
                      "Recibidas",
                      "Guardadas",
                      "Descartadas",
                      "Detalle",
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-label-md text-on-surface-variant"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {r.detalle.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-body-md text-on-surface-variant"
                      >
                        Sin conexiones activas en esta corrida.
                      </td>
                    </tr>
                  ) : (
                    r.detalle.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-body-md">
                          {d.fuente}
                          <span className="block text-label-sm text-on-surface-variant">
                            {d.etiqueta}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-label-md">
                          {d.estado === "ok" ? (
                            <span className="text-success">ok</span>
                          ) : (
                            <span className="text-error">error</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-body-md tabular-nums">
                          {num(d.recibidas)}
                        </td>
                        <td className="px-3 py-2 text-body-md tabular-nums">
                          {num(d.aceptadas)}
                        </td>
                        <td className="px-3 py-2 text-body-md tabular-nums">
                          {d.descartadas > 0 ? (
                            <span className="font-semibold text-error">
                              {num(d.descartadas)}
                            </span>
                          ) : (
                            "0"
                          )}
                        </td>
                        <td className="px-3 py-2 text-label-sm">
                          {d.error && (
                            <p className="text-error">{d.error}</p>
                          )}
                          {d.scope !== undefined && (
                            <p className="text-on-surface-variant">
                              scope:{" "}
                              <code className="text-on-surface">
                                {d.scope || "(vacío)"}
                              </code>
                            </p>
                          )}
                          {d.por_datasource &&
                            Object.keys(d.por_datasource).length > 0 && (
                              <p className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(d.por_datasource).map(([k, v]) => {
                                  const fuera = d.descartados_por_scope?.[k] ?? 0;
                                  const todoFuera = fuera === v;
                                  return (
                                    <span
                                      key={k}
                                      className={`${chip} ${
                                        todoFuera
                                          ? "bg-error-container text-error"
                                          : "bg-surface-container text-on-surface-variant"
                                      }`}
                                      title={
                                        todoFuera
                                          ? "El scope descartó todas estas filas"
                                          : undefined
                                      }
                                    >
                                      {k}: {v}
                                      {fuera > 0 && ` (${fuera} fuera)`}
                                    </span>
                                  );
                                })}
                              </p>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Resumen({
  label,
  valor,
  tone = "neutral",
}: {
  label: string;
  valor: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-success" : tone === "bad" ? "text-error" : "text-brand";
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-1 text-headline-sm tabular-nums ${color}`}>{valor}</p>
    </div>
  );
}
