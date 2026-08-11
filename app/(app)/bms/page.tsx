import Link from "next/link";
import { Facebook } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toggleExclusionCuenta } from "@/app/actions";
import { PageHeader, Panel } from "@/components/panel";
import { AutoRefresh } from "@/components/auto-refresh";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Conexion = {
  id: string;
  label: string;
  business_id: string | null;
  active: boolean;
  last_ok_at: string | null;
  last_error: string | null;
};

type Cuenta = {
  connection_id: string;
  account_id: string;
  account_name: string;
  currency: string | null;
  timezone_name: string | null;
  account_status: number | null;
  excluida: boolean;
};

/** Estados de cuenta publicitaria de Facebook. */
const ESTADOS: Record<number, string> = {
  1: "Activa",
  2: "Deshabilitada",
  3: "Sin pagar",
  7: "En revisión",
  8: "Cierre pendiente",
  9: "Periodo de gracia",
  100: "Cerrada",
  101: "Cualquier activa",
  102: "Cualquier cerrada",
};

export default async function BMsPage() {
  const supabase = await createClient();
  const [connRes, cuentasRes] = await Promise.all([
    supabase
      .from("connections")
      .select("id,label,business_id,active,last_ok_at,last_error")
      .eq("platform", "facebook")
      .order("label"),
    supabase
      .from("fb_ad_accounts")
      .select(
        "connection_id,account_id,account_name,currency,timezone_name,account_status,excluida",
      )
      .order("account_name"),
  ]);

  const bms = (connRes.data ?? []) as Conexion[];
  const cuentas = (cuentasRes.data ?? []) as Cuenta[];
  const faltaTabla = Boolean(cuentasRes.error);

  const porBM = new Map<string, Cuenta[]>();
  for (const c of cuentas) {
    if (!porBM.has(c.connection_id)) porBM.set(c.connection_id, []);
    porBM.get(c.connection_id)!.push(c);
  }

  const totalExcluidas = cuentas.filter((c) => c.excluida).length;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="BMs de Facebook"
        descripcion="Un BM por token. Las cuentas se descubren solas en cada corrida. Excluir una cuenta la deja fuera del gasto y del reporte desde la medición siguiente; el histórico ya guardado no cambia."
      >
        <AutoRefresh segundos={120} />
      </PageHeader>

      {faltaTabla && (
        <div className="rounded-xl border border-error bg-error-container p-md text-body-md">
          <p className="font-semibold text-on-surface">
            Falta la tabla <code>fb_ad_accounts</code>
          </p>
          <p className="mt-1 text-on-surface-variant">
            Ejecuta la migración <code>0006</code> en el SQL Editor de Supabase.
          </p>
        </div>
      )}

      {bms.length === 0 && !faltaTabla && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-body-md">
          <p className="font-semibold text-on-surface">Sin BMs registrados</p>
          <p className="mt-1 text-on-surface-variant">
            Agrega un token de Facebook en{" "}
            <Link href="/connections" className="text-brand-crimson underline">
              Conexiones
            </Link>
            . Puedes poner uno por cada BM.
          </p>
        </div>
      )}

      {totalExcluidas > 0 && (
        <p className="text-body-md text-on-surface-variant">
          {num(totalExcluidas)} cuenta(s) excluida(s) del reporte en total.
        </p>
      )}

      {bms.map((bm) => {
        const lista = porBM.get(bm.id) ?? [];
        const excluidas = lista.filter((c) => c.excluida).length;
        return (
          <Panel
            key={bm.id}
            titulo={bm.label}
            icono={<Facebook className="h-5 w-5" />}
            acciones={
              <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
                <span>
                  BM {bm.business_id ?? "— (todas las del token)"}
                </span>
                <span>·</span>
                <span>{lista.length} cuentas</span>
                {excluidas > 0 && (
                  <span className="font-semibold text-warning">
                    · {excluidas} excluidas
                  </span>
                )}
                {!bm.active && <span className="text-error">· pausado</span>}
              </div>
            }
          >
            <div className="p-md">
              {bm.last_error && (
                <p className="mb-md rounded-lg border border-error bg-error-container px-3 py-2 text-body-md">
                  {bm.last_error.slice(0, 300)}
                </p>
              )}

              {lista.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">
                  Todavía no se han descubierto cuentas. Pulsa &ldquo;Actualizar
                  ahora&rdquo; en Conexiones y vuelve aquí.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full text-left">
                    <thead className="border-b border-outline-variant bg-surface-container-low">
                      <tr>
                        {["Cuenta", "ID", "Estado", "Moneda", "En el reporte", ""].map(
                          (h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap px-3 py-2 text-label-md text-on-surface-variant"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {lista.map((c) => (
                        <tr
                          key={c.account_id}
                          className={`transition-colors hover:bg-surface-container-low ${
                            c.excluida ? "opacity-60" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-body-md">
                            {c.account_name || "(sin nombre)"}
                          </td>
                          <td className="px-3 py-2 font-mono text-label-sm text-on-surface-variant">
                            {c.account_id}
                          </td>
                          <td className="px-3 py-2 text-label-sm text-on-surface-variant">
                            {c.account_status === null
                              ? "—"
                              : (ESTADOS[c.account_status] ??
                                `Estado ${c.account_status}`)}
                          </td>
                          <td className="px-3 py-2 text-label-sm text-on-surface-variant">
                            {c.currency ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-label-md">
                            {c.excluida ? (
                              <span className="text-warning">Excluida</span>
                            ) : (
                              <span className="text-success">Incluida</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <ActionForm
                              accion={toggleExclusionCuenta}
                              className="flex justify-end"
                            >
                              <input
                                type="hidden"
                                name="connection_id"
                                value={c.connection_id}
                              />
                              <input
                                type="hidden"
                                name="account_id"
                                value={c.account_id}
                              />
                              <input
                                type="hidden"
                                name="excluida"
                                value={String(c.excluida)}
                              />
                              <SubmitButton className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand">
                                {c.excluida ? "Incluir" : "Excluir"}
                              </SubmitButton>
                            </ActionForm>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
