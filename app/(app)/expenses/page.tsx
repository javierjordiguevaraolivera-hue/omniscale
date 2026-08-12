import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/tz";
import { alternarGasto, borrarGasto, guardarGasto } from "@/app/actions";
import { PageHeader, Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { money } from "@/lib/format";
import {
  CATEGORIAS,
  estadoDeGasto,
  mesDe,
  montoEnMes,
  sugerirPagadoHasta,
  totalDelMes,
  type Gasto,
} from "@/lib/gastos";

export const dynamic = "force-dynamic";

const TONOS: Record<string, string> = {
  ok: "text-success",
  pendiente: "text-brand-steel",
  apagado: "text-warning",
  terminado: "text-on-surface-variant",
};

const campo =
  "h-9 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("timezone")
    .eq("id", 1)
    .single();
  const hoy = todayInTz(settings?.timezone ?? "America/New_York");
  const mes = mesDe(hoy);

  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .order("activo", { ascending: false })
    .order("nombre");
  const gastos = (data ?? []) as Gasto[];

  const delMes = totalDelMes(gastos, mes);
  const activos = gastos.filter((g) => g.activo).length;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Gastos"
        descripcion="Lo que no es publicidad: suscripciones, herramientas, contabilidad. Todo en dólares. Se descuenta del resultado MENSUAL en Histórico (profit neto), nunca del día: un cobro de una herramienta no puede hacer ver un martes en pérdida."
      />

      {error && (
        <div className="rounded-xl border border-error bg-error-container p-md text-body-md">
          <p className="font-semibold text-on-surface">
            Falta ejecutar la migración <code>0007</code>
          </p>
          <p className="mt-1 text-on-surface-variant">
            La tabla <code>gastos</code> todavía no existe. Pégala en el SQL Editor
            de Supabase.
          </p>
        </div>
      )}

      {!error && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-body-md">
          <p className="text-on-surface">
            Este mes ({mes}):{" "}
            <strong className="tabular-nums">{money(delMes)}</strong> ·{" "}
            {activos} activo(s) de {gastos.length}
          </p>
        </div>
      )}

      <Panel titulo="Registrar un gasto" icono={<Receipt className="h-5 w-5" />}>
        <ActionForm
          accion={guardarGasto}
          className="grid gap-3 p-md md:grid-cols-3"
        >
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Plataforma
            <input name="nombre" required className={campo} autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Motivo
            <input name="motivo" className={campo} autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Categoría
            <select name="categoria" className={campo} defaultValue="herramientas">
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Monto (USD)
            <input
              name="monto"
              type="number"
              step="0.01"
              min="0"
              required
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Tipo
            <select name="tipo" className={campo} defaultValue="suscripcion">
              <option value="suscripcion">Suscripción (cobra cada mes)</option>
              <option value="unico">Único (se cobró una vez)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Día de cobro
            <input
              name="dia_cobro"
              type="number"
              min="1"
              max="31"
              placeholder="14"
              className={campo}
            />
            <span className="text-label-sm">
              Solo para suscripción. Si el mes no tiene ese día (31 en febrero) se
              usa el último.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant">
            Desde
            <input
              name="inicio"
              type="date"
              defaultValue={hoy}
              className={campo}
            />
          </label>
          <label className="flex flex-col gap-1 text-label-md text-on-surface-variant md:col-span-2">
            Notas
            <input name="notas" className={campo} autoComplete="off" />
          </label>
          <div className="flex items-end md:col-span-3">
            <SubmitButton className="rounded-lg bg-brand px-md py-2 text-label-md font-semibold text-white transition-opacity hover:opacity-90">
              Agregar gasto
            </SubmitButton>
          </div>
        </ActionForm>
      </Panel>

      <DataTable
        titulo="Gastos registrados"
        icono={<Receipt className="h-5 w-5" />}
        filas={gastos}
        rowKey={(g) => g.id}
        vacio="Todavía no hay gastos registrados."
        sustantivo="gastos"
        columnas={[
          {
            key: "nombre",
            label: "Plataforma",
            render: (g) => (
              <div className="flex flex-col">
                <span className={g.activo ? "" : "text-on-surface-variant"}>
                  {g.nombre}
                </span>
                {g.motivo && (
                  <span className="text-label-sm text-on-surface-variant">
                    {g.motivo}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "categoria",
            label: "Categoría",
            render: (g) => (
              <span className="text-label-md text-on-surface-variant">
                {g.categoria}
              </span>
            ),
          },
          {
            key: "tipo",
            label: "Tipo",
            render: (g) => (
              <span className="text-label-md text-on-surface-variant">
                {g.tipo === "suscripcion" ? "Suscripción" : "Único"}
              </span>
            ),
          },
          {
            key: "monto",
            label: "Monto",
            align: "right",
            render: (g) => (
              <span className="tabular-nums">{money(Number(g.monto))}</span>
            ),
          },
          {
            key: "mes",
            label: "Cuenta este mes",
            align: "right",
            render: (g) => {
              const m = montoEnMes(g, mes);
              return (
                <span
                  className={`tabular-nums ${m > 0 ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}
                >
                  {m > 0 ? money(m) : "—"}
                </span>
              );
            },
          },
          {
            key: "estado",
            label: "Estado",
            render: (g) => {
              const e = estadoDeGasto(g, hoy);
              return (
                <span className={`text-label-md ${TONOS[e.tono]}`}>{e.texto}</span>
              );
            },
          },
          {
            key: "acciones",
            label: "",
            render: (g) => (
              <div className="flex items-center justify-end gap-2">
                {g.activo ? (
                  // Al apagar hay que decir hasta qué día está pagado: en SaaS se
                  // cancela al final del periodo, así que puede quedar un cobro ya
                  // hecho que sí cuenta, o ninguno. Viene sugerida la fecha real.
                  <ActionForm
                    accion={alternarGasto}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="apagar" value="true" />
                    <label className="flex items-center gap-1 text-label-sm text-on-surface-variant">
                      pagado hasta
                      <input
                        name="pagado_hasta"
                        type="date"
                        defaultValue={sugerirPagadoHasta(g, hoy)}
                        className="h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-label-md"
                      />
                    </label>
                    <SubmitButton className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-warning">
                      Apagar
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <ActionForm accion={alternarGasto}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="apagar" value="false" />
                    <SubmitButton className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand">
                      Reactivar
                    </SubmitButton>
                  </ActionForm>
                )}
                <ActionForm accion={borrarGasto}>
                  <input type="hidden" name="id" value={g.id} />
                  <SubmitButton className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-error-container hover:text-error">
                    Borrar
                  </SubmitButton>
                </ActionForm>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
