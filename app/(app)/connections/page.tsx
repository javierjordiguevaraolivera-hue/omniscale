import { createClient } from "@/lib/supabase/server";
import { addConnection, deleteConnection, toggleConnection } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RunNowButton } from "@/components/run-now-button";

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Conexiones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Las credenciales solo las usa el servidor; nunca se envían al navegador.
          </p>
        </div>
        <RunNowButton />
      </div>

      {/* Everflow */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Everflow</h2>
        <p className="text-xs text-muted-foreground mb-4">
          API key de afiliado. De aquí salen las conversiones y el revenue por
          oferta y source ID.
        </p>
        <TablaConexiones conns={everflow} />
        <form action={addConnection} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] mt-4">
          <input type="hidden" name="platform" value="everflow" />
          <div className="grid gap-1.5">
            <Label htmlFor="ef-label" className="text-xs">Etiqueta</Label>
            <Input id="ef-label" name="label" placeholder="Cuenta principal" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ef-key" className="text-xs">X-Eflow-Api-Key</Label>
            <Input id="ef-key" name="api_key" type="password" required placeholder="••••••" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm">Agregar</Button>
          </div>
        </form>
      </section>

      {/* Plataformas de gasto */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Plataformas de gasto</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Un token por app / Business Manager. Puedes agregar tantos como VMs
          tengas: las cuentas de todos se juntan en una sola lista, sin importar de
          qué BM vengan.
        </p>
        <TablaConexiones conns={otras} />
        <form action={addConnection} className="grid gap-3 sm:grid-cols-[auto_1fr_2fr_auto] mt-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pl-platform" className="text-xs">Plataforma</Label>
            <select
              id="pl-platform"
              name="platform"
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              defaultValue="facebook"
            >
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pl-label" className="text-xs">Etiqueta</Label>
            <Input id="pl-label" name="label" placeholder="VM1 / BM Seguros" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pl-key" className="text-xs">Access token</Label>
            <Input id="pl-key" name="api_key" type="password" required placeholder="••••••" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm">Agregar</Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          Solo TikTok y Google quedan registrados por ahora: la lectura de gasto
          está implementada para Facebook. Cuando quieras activar otra plataforma,
          se agrega su lector y el resto del sistema ya la soporta.
        </p>
      </section>
    </div>
  );
}

function TablaConexiones({ conns }: { conns: Connection[] }) {
  if (conns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Todavía no hay conexiones registradas.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-medium">Plataforma</th>
            <th className="py-2 pr-4 font-medium">Etiqueta</th>
            <th className="py-2 pr-4 font-medium">Credencial</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {conns.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">{PLATAFORMAS[c.platform] ?? c.platform}</td>
              <td className="py-3 pr-4">{c.label}</td>
              <td className="py-3 pr-4 font-mono text-xs">{mask(c.api_key)}</td>
              <td className="py-3 pr-4 text-xs">
                {!c.active ? (
                  <span className="text-muted-foreground">Pausada</span>
                ) : c.last_error ? (
                  <span className="text-[#d03b3b]" title={c.last_error}>
                    ⚠ Error: {c.last_error.slice(0, 60)}
                  </span>
                ) : c.last_ok_at ? (
                  <span className="text-[#006300]">
                    ✓ OK · {new Date(c.last_ok_at).toLocaleString("es-PE")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin usar aún</span>
                )}
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2 justify-end">
                  <form action={toggleConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <Button type="submit" size="sm" variant="outline">
                      {c.active ? "Pausar" : "Activar"}
                    </Button>
                  </form>
                  <form action={deleteConnection}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Eliminar
                    </Button>
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
