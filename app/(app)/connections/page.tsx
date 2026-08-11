import Link from "next/link";
import { Facebook, KeyRound, Wallet, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addConnection,
  deleteConnection,
  toggleConnection,
  updateScope,
} from "@/app/actions";
import { RunNowButton } from "@/components/run-now-button";
import { PageHeader, Panel } from "@/components/panel";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ScopePicker } from "@/components/scope-picker";
import type { DetalleFuente } from "@/lib/ingest/run";

export const dynamic = "force-dynamic";

type Connection = {
  id: string;
  platform: string;
  label: string;
  api_key: string;
  scope: string | null;
  refresh_interval: string | null;
  business_id: string | null;
  active: boolean;
  last_ok_at: string | null;
  last_error: string | null;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-brand/20";
const labelClass = "text-label-md text-on-surface-variant";
const botonClass =
  "h-10 rounded-lg bg-brand px-4 text-label-md text-white transition-opacity hover:opacity-90";
const botonChico =
  "rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand";

/** Muestra solo los últimos caracteres de la credencial. */
function mask(key: string) {
  if (key.length <= 8) return "••••••••";
  return `••••••••${key.slice(-6)}`;
}

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: runs }] = await Promise.all([
    supabase.from("connections").select("*").order("platform").order("label"),
    supabase
      .from("ingest_runs")
      .select("detalle")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  const conns = (data ?? []) as Connection[];
  const everflow = conns.filter((c) => c.platform === "everflow");
  const facebook = conns.filter((c) => c.platform === "facebook");
  const windsor = conns.filter((c) => c.platform === "windsor");
  const zernio = conns.filter((c) => c.platform === "zernio");

  // Plataformas que cada fuente devolvió de verdad en las últimas corridas: se
  // marcan con un punto verde para no tener que adivinar cómo las nombra.
  const vistasPorFuente = (fuente: string) => {
    const vistas = new Set<string>();
    for (const r of (runs ?? []) as { detalle: DetalleFuente[] }[]) {
      for (const d of r.detalle ?? []) {
        if (d.fuente !== fuente) continue;
        for (const ds of Object.keys(d.por_datasource ?? {})) vistas.add(ds);
      }
    }
    return [...vistas];
  };
  const vistasWindsor = vistasPorFuente("windsor");
  const vistasZernio = vistasPorFuente("zernio");

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Conexiones"
        descripcion="Las credenciales solo las usa el servidor; nunca se envían al navegador."
      >
        <RunNowButton />
      </PageHeader>

      {error && (
        <div className="rounded-xl border border-error bg-error-container p-md text-body-md">
          <p className="font-semibold text-on-surface">
            No se pudo leer la tabla de conexiones
          </p>
          <p className="mt-1 text-on-surface-variant">
            Revisa en Ajustes qué migraciones de{" "}
            <code>supabase/migrations/</code> están pendientes y ejecútalas en el
            SQL Editor. Hasta entonces, guardar una credencial va a fallar.
          </p>
        </div>
      )}

      <Panel
        titulo="Everflow · conversiones y revenue"
        icono={<KeyRound className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            API key de afiliado. De aquí salen las conversiones y el revenue por
            oferta y source ID.
          </p>
          <TablaConexiones conns={everflow} />
          <ActionForm
            accion={addConnection}
            className="mt-md grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
          >
            <input type="hidden" name="platform" value="everflow" />
            <label className="grid gap-1.5">
              <span className={labelClass}>Etiqueta</span>
              <input name="label" placeholder="Cuenta principal" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>X-Eflow-Api-Key</span>
              <input
                name="api_key"
                type="password"
                required
                placeholder="••••••"
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <SubmitButton className={botonClass}>Agregar</SubmitButton>
            </div>
          </ActionForm>
        </div>
      </Panel>

      <Panel
        titulo="Facebook · gasto por cuenta"
        icono={<Facebook className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Un token por VM: agrega tantos como tengas. Con el token se listan las
            cuentas del Business Manager y se pide el gasto del día de cada una,
            descartando las que no gastaron. Las cuentas descubiertas y sus
            exclusiones se gestionan en{" "}
            <Link href="/vms" className="text-brand-crimson underline">
              VMs
            </Link>
            . La oferta se detecta del número en el nombre de la cuenta.
          </p>
          <TablaConexiones conns={facebook} />
          <ActionForm accion={addConnection} className="mt-md flex flex-col gap-3">
            <input type="hidden" name="platform" value="facebook" />
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <label className="grid gap-1.5">
                <span className={labelClass}>Nombre del VM</span>
                <input
                  name="label"
                  placeholder="VM1 · BM Marcelo"
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelClass}>Business ID (opcional)</span>
                <input
                  name="business_id"
                  placeholder="170678730571721"
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelClass}>Access token</span>
                <input
                  name="api_key"
                  type="password"
                  required
                  placeholder="••••••"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <SubmitButton className={botonClass}>Agregar VM</SubmitButton>
              </div>
            </div>
            <p className="text-label-sm text-on-surface-variant">
              El Business ID sale de la URL del Business Manager. Si lo dejas
              vacío se usan todas las cuentas que alcance el token.
            </p>
          </ActionForm>
        </div>
      </Panel>

      <Panel
        titulo="Windsor.ai · gasto por campaña"
        icono={<Wallet className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Trae gasto y clicks a nivel de campaña. Marca solo las plataformas
            que quieres tomar de aquí: el gasto de Facebook entra por su propio
            token y si Windsor también lo trajera se contaría doble. El punto
            verde marca las que Windsor está devolviendo ahora. Basta el nombre
            corto: <code>google</code> también acepta <code>google_ads</code>.
          </p>
          <TablaConexiones conns={windsor} conScope vistas={vistasWindsor} />
          <ActionForm accion={addConnection} className="mt-md flex flex-col gap-3">
            <input type="hidden" name="platform" value="windsor" />
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <label className="grid gap-1.5">
                <span className={labelClass}>Etiqueta</span>
                <input
                  name="label"
                  placeholder="Windsor"
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelClass}>api_key de Windsor</span>
                <input
                  name="api_key"
                  type="password"
                  required
                  placeholder="••••••"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <SubmitButton className={botonClass}>Agregar</SubmitButton>
              </div>
            </div>
            <div className="grid gap-1.5">
              <span className={labelClass}>Plataformas que aporta Windsor</span>
              <ScopePicker vistas={vistasWindsor} />
            </div>
          </ActionForm>
        </div>
      </Panel>

      <Panel
        titulo="Zernio · gasto por campaña"
        icono={<Zap className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Alternativa a Windsor: una sola API key cubre Meta, TikTok y Google
            Ads. El OAuth con cada cuenta publicitaria se hace una vez en el
            panel de Zernio; aquí solo va la key (empieza con <code>sk_</code>).
            Zernio reporta cuándo sincronizó por última vez, y eso aparece en
            Logs para saber si la data viene fresca.
          </p>
          <p className="mb-md rounded-lg border border-warning bg-[#fff7f3] px-3 py-2 text-label-sm text-on-surface-variant">
            No actives Zernio y Windsor para la misma plataforma: el gasto se
            contaría dos veces. Usa uno u otro, o repártelas con las casillas.
          </p>
          <TablaConexiones conns={zernio} conScope vistas={vistasZernio} />
          <ActionForm accion={addConnection} className="mt-md flex flex-col gap-3">
            <input type="hidden" name="platform" value="zernio" />
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <label className="grid gap-1.5">
                <span className={labelClass}>Etiqueta</span>
                <input
                  name="label"
                  placeholder="Zernio"
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-1.5">
                <span className={labelClass}>API key de Zernio</span>
                <input
                  name="api_key"
                  type="password"
                  required
                  placeholder="sk_..."
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <div className="flex items-end">
                <SubmitButton className={botonClass}>Agregar</SubmitButton>
              </div>
            </div>
            <div className="grid gap-1.5">
              <span className={labelClass}>Plataformas que aporta Zernio</span>
              <ScopePicker vistas={vistasZernio} conRefresh={false} />
            </div>
          </ActionForm>
        </div>
      </Panel>
    </div>
  );
}

function TablaConexiones({
  conns,
  conScope = false,
  vistas = [],
}: {
  conns: Connection[];
  conScope?: boolean;
  vistas?: string[];
}) {
  if (conns.length === 0) {
    return (
      <p className="py-xs text-body-md text-on-surface-variant">
        Todavía no hay conexiones registradas.
      </p>
    );
  }
  const cabeceras = conScope
    ? ["Etiqueta", "Credencial", "Plataformas", "Estado", ""]
    : ["Etiqueta", "Credencial", "Estado", ""];

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left">
        <thead className="border-b border-outline-variant bg-surface-container-low">
          <tr>
            {cabeceras.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap px-3 py-2 text-label-md text-on-surface-variant"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/40">
          {conns.map((c) => (
            <tr key={c.id} className="transition-colors hover:bg-surface-container-low">
              <td className="px-3 py-2 text-body-md">{c.label}</td>
              <td className="px-3 py-2 font-mono text-label-sm">{mask(c.api_key)}</td>
              {conScope && (
                <td className="px-3 py-2">
                  <ActionForm accion={updateScope} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <ScopePicker
                      valorInicial={c.scope}
                      refreshInicial={c.refresh_interval}
                      vistas={vistas}
                    />
                    <SubmitButton className={`${botonChico} self-start`}>
                      Guardar plataformas
                    </SubmitButton>
                  </ActionForm>
                </td>
              )}
              <td className="px-3 py-2 text-label-sm">
                {!c.active ? (
                  <span className="text-on-surface-variant">Pausada</span>
                ) : c.last_error ? (
                  <span className="text-error" title={c.last_error}>
                    ⚠ Error: {c.last_error.slice(0, 60)}
                  </span>
                ) : c.last_ok_at ? (
                  <span className="text-success">
                    ✓ OK · {new Date(c.last_ok_at).toLocaleString("es-PE")}
                  </span>
                ) : (
                  <span className="text-on-surface-variant">Sin usar aún</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <ActionForm accion={toggleConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <SubmitButton className={botonChico}>
                      {c.active ? "Pausar" : "Activar"}
                    </SubmitButton>
                  </ActionForm>
                  <ActionForm accion={deleteConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton className="rounded-lg px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:text-error">
                      Eliminar
                    </SubmitButton>
                  </ActionForm>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
