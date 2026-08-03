import { KeyRound, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addConnection, deleteConnection, toggleConnection } from "@/app/actions";
import { RunNowButton } from "@/components/run-now-button";
import { PageHeader, Panel } from "@/components/panel";

export const dynamic = "force-dynamic";

type Connection = {
  id: string;
  platform: string;
  label: string;
  api_key: string;
  active: boolean;
  last_ok_at: string | null;
  last_error: string | null;
};

const PLATAFORMAS: Record<string, string> = {
  everflow: "Everflow",
  facebook: "Facebook",
  tiktok: "TikTok",
  google: "Google",
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
  const otras = conns.filter((c) => c.platform !== "everflow");

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Conexiones"
        descripcion="Las credenciales solo las usa el servidor; nunca se envían al navegador."
      >
        <RunNowButton />
      </PageHeader>

      <Panel titulo="Everflow" icono={<KeyRound className="h-5 w-5" />}>
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

      <Panel titulo="Plataformas de gasto" icono={<Wallet className="h-5 w-5" />}>
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Un token por app / Business Manager. Puedes agregar tantos como VMs
            tengas: las cuentas de todos se juntan en una sola lista, sin importar
            de qué BM vengan.
          </p>
          <TablaConexiones conns={otras} />
          <form
            action={addConnection}
            className="mt-md grid gap-3 sm:grid-cols-[auto_1fr_2fr_auto]"
          >
            <label className="grid gap-1.5">
              <span className={labelClass}>Plataforma</span>
              <select name="platform" defaultValue="facebook" className={inputClass}>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
              </select>
            </label>
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
          <p className="mt-md text-label-sm text-on-surface-variant">
            La lectura de gasto está implementada para Facebook. TikTok y Google se
            pueden registrar; cuando quieras activarlas se agrega su lector y el
            resto del sistema ya las soporta.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function TablaConexiones({ conns }: { conns: Connection[] }) {
  if (conns.length === 0) {
    return (
      <p className="py-xs text-body-md text-on-surface-variant">
        Todavía no hay conexiones registradas.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left">
        <thead className="border-b border-outline-variant bg-surface-container-low">
          <tr>
            {["Plataforma", "Etiqueta", "Credencial", "Estado", ""].map((h, i) => (
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
              <td className="px-3 py-2 text-body-md">
                {PLATAFORMAS[c.platform] ?? c.platform}
              </td>
              <td className="px-3 py-2 text-body-md">{c.label}</td>
              <td className="px-3 py-2 font-mono text-label-sm">{mask(c.api_key)}</td>
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
