import { Facebook, KeyRound, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  addConnection,
  deleteConnection,
  toggleConnection,
  updateScope,
} from "@/app/actions";
import { RunNowButton } from "@/components/run-now-button";
import { PageHeader, Panel } from "@/components/panel";

export const dynamic = "force-dynamic";

type Connection = {
  id: string;
  platform: string;
  label: string;
  api_key: string;
  scope: string | null;
  active: boolean;
  last_ok_at: string | null;
  last_error: string | null;
};

const inputClass =
  "h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-brand/20";
const labelClass = "text-label-md text-on-surface-variant";
const botonClass =
  "h-10 rounded-lg bg-brand px-4 text-label-md text-white transition-opacity hover:opacity-90";

/** Muestra solo los últimos caracteres de la credencial. */
function mask(key: string) {
  if (key.length <= 8) return "••••••••";
  return `••••••••${key.slice(-6)}`;
}

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("connections")
    .select("*")
    .order("platform")
    .order("label");
  const conns = (data ?? []) as Connection[];
  const everflow = conns.filter((c) => c.platform === "everflow");
  const facebook = conns.filter((c) => c.platform === "facebook");
  const windsor = conns.filter((c) => c.platform === "windsor");

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Conexiones"
        descripcion="Las credenciales solo las usa el servidor; nunca se envían al navegador."
      >
        <RunNowButton />
      </PageHeader>

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
          <form
            action={addConnection}
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
              <button type="submit" className={botonClass}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <Panel
        titulo="Facebook · gasto por cuenta"
        icono={<Facebook className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Un token por app / Business Manager: agrega tantos como VMs tengas.
            Las cuentas de todos se juntan en una sola lista. La oferta se detecta
            del <code>oid_&lt;ID&gt;</code> en el nombre de la cuenta.
          </p>
          <TablaConexiones conns={facebook} />
          <form
            action={addConnection}
            className="mt-md grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
          >
            <input type="hidden" name="platform" value="facebook" />
            <label className="grid gap-1.5">
              <span className={labelClass}>Etiqueta</span>
              <input name="label" placeholder="VM1 / BM Seguros" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>Access token</span>
              <input
                name="api_key"
                type="password"
                required
                placeholder="••••••"
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className={botonClass}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <Panel
        titulo="Windsor.ai · gasto por campaña"
        icono={<Wallet className="h-5 w-5" />}
      >
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Trae gasto y clicks a nivel de campaña. Por defecto se toman{" "}
            <strong>TikTok y Google</strong>: el gasto de Facebook entra por su
            propio token y si Windsor también lo trajera se contaría doble. En
            &ldquo;Plataformas&rdquo; puedes listar otras separadas por coma, o
            poner <code>*</code> para aceptar todas. Basta el nombre corto:{" "}
            <code>google</code> también acepta <code>google_ads</code>.
          </p>
          <TablaConexiones conns={windsor} conScope />
          <form
            action={addConnection}
            className="mt-md grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
          >
            <input type="hidden" name="platform" value="windsor" />
            <label className="grid gap-1.5">
              <span className={labelClass}>Etiqueta</span>
              <input name="label" placeholder="Windsor" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className={labelClass}>Plataformas</span>
              <input
                name="scope"
                placeholder="tiktok,google"
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
                className={inputClass}
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className={botonClass}>
                Agregar
              </button>
            </div>
          </form>
        </div>
      </Panel>
    </div>
  );
}

function TablaConexiones({
  conns,
  conScope = false,
}: {
  conns: Connection[];
  conScope?: boolean;
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
                  <form action={updateScope} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="scope"
                      defaultValue={c.scope ?? "tiktok,google"}
                      className="h-9 w-40 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand"
                    >
                      Guardar
                    </button>
                  </form>
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
                  <form action={toggleConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-brand"
                    >
                      {c.active ? "Pausar" : "Activar"}
                    </button>
                  </form>
                  <form action={deleteConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-lg px-sm py-1 text-label-md text-on-surface-variant transition-colors hover:text-error"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
