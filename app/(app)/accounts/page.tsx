import { createClient } from "@/lib/supabase/server";
import { assignOffer } from "@/app/actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Account = {
  account_id: string;
  name: string;
  offer_id: number | null;
  auto_mapped: boolean;
  updated_at: string;
};
type Offer = { offer_id: number; name: string };

export default async function AccountsPage() {
  const supabase = await createClient();
  const [accRes, offersRes] = await Promise.all([
    supabase
      .from("ad_accounts")
      .select("account_id,name,offer_id,auto_mapped,updated_at")
      .order("name"),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);
  const accounts = (accRes.data ?? []) as Account[];
  const offers = (offersRes.data ?? []) as Offer[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas publicitarias</h1>
        <p className="text-sm text-muted-foreground mt-1">
          El mapeo automático lee <code>oid_&lt;ID&gt;</code> del nombre de la cuenta
          en Facebook. Si el nombre no lo trae, asígnala manualmente aquí. Cambiar
          la oferta solo afecta las capturas futuras: el histórico ya guardado
          conserva la oferta que tenía en ese momento.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Cuenta</th>
                <th className="py-2 pr-4 font-medium">Origen del mapeo</th>
                <th className="py-2 font-medium">Oferta</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-muted-foreground">
                    Todavía no se han descubierto cuentas. Registra un token de
                    Facebook en Conexiones y ejecuta una actualización.
                  </td>
                </tr>
              )}
              {accounts.map((a) => (
                <tr key={a.account_id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    {a.name || a.account_id}
                    <span className="block text-xs text-muted-foreground">
                      {a.account_id}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs">
                    {a.auto_mapped ? (
                      <span className="text-[#006300]">Automático (oid_)</span>
                    ) : a.offer_id !== null ? (
                      <span className="text-muted-foreground">Manual</span>
                    ) : (
                      <span className="text-[#d03b3b] font-medium">Sin configurar</span>
                    )}
                  </td>
                  <td className="py-3">
                    <form action={assignOffer} className="flex items-center gap-2">
                      <input type="hidden" name="account_id" value={a.account_id} />
                      <select
                        name="offer_id"
                        defaultValue={a.offer_id === null ? "" : String(a.offer_id)}
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                      >
                        <option value="">— Sin asignar —</option>
                        {offers.map((o) => (
                          <option key={o.offer_id} value={String(o.offer_id)}>
                            {o.name || `Oferta ${o.offer_id}`} · {o.offer_id}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Guardar
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
