import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { assignOffer } from "@/app/actions";
import { PageHeader } from "@/components/panel";
import { DataTable } from "@/components/data-table";

export const dynamic = "force-dynamic";

type Account = {
  account_id: string;
  name: string;
  offer_id: number | null;
  auto_mapped: boolean;
};
type Offer = { offer_id: number; name: string };

export default async function AccountsPage() {
  const supabase = await createClient();
  const [accRes, offersRes] = await Promise.all([
    supabase
      .from("ad_accounts")
      .select("account_id,name,offer_id,auto_mapped")
      .order("name"),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);
  const accounts = (accRes.data ?? []) as Account[];
  const offers = (offersRes.data ?? []) as Offer[];

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Cuentas publicitarias"
        descripcion="El mapeo automático lee oid_<ID> del nombre de la cuenta en Facebook. Cambiar la oferta solo afecta las capturas futuras: el histórico conserva la que tenía."
      />

      <DataTable
        titulo="Mapeo cuenta → oferta"
        icono={<Wallet className="h-5 w-5" />}
        filas={accounts}
        rowKey={(a) => a.account_id}
        vacio="Todavía no se han descubierto cuentas. Registra un token de Facebook en Conexiones y ejecuta una actualización."
        sustantivo="cuentas"
        alto="max-h-[calc(100vh-19rem)]"
        columnas={[
          {
            key: "account",
            label: "Cuenta",
            render: (a) => (
              <div>
                <span>{a.name || a.account_id}</span>
                <span className="block text-label-sm text-on-surface-variant">
                  {a.account_id}
                </span>
              </div>
            ),
          },
          {
            key: "origen",
            label: "Origen del mapeo",
            render: (a) =>
              a.auto_mapped ? (
                <span className="text-label-md text-success">Automático (oid_)</span>
              ) : a.offer_id !== null ? (
                <span className="text-label-md text-on-surface-variant">Manual</span>
              ) : (
                <span className="text-label-md font-semibold text-error">
                  Sin configurar
                </span>
              ),
          },
          {
            key: "oferta",
            label: "Oferta",
            render: (a) => (
              <form action={assignOffer} className="flex items-center gap-2">
                <input type="hidden" name="account_id" value={a.account_id} />
                <select
                  name="offer_id"
                  defaultValue={a.offer_id === null ? "" : String(a.offer_id)}
                  className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">— Sin asignar —</option>
                  {offers.map((o) => (
                    <option key={o.offer_id} value={String(o.offer_id)}>
                      {o.name || `Oferta ${o.offer_id}`} · {o.offer_id}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-brand"
                >
                  Guardar
                </button>
              </form>
            ),
          },
        ]}
      />
    </div>
  );
}
