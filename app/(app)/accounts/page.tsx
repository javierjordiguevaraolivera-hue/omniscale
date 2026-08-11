import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { assignOffer } from "@/app/actions";
import { PageHeader } from "@/components/panel";
import { AutoRefresh } from "@/components/auto-refresh";
import { DataTable } from "@/components/data-table";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { platformLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type SpendMap = {
  datasource: string;
  account_name: string;
  campaign: string;
  offer_id: number | null;
  origen: string;
};
type Offer = { offer_id: number; name: string };

const ORIGENES: Record<string, { texto: string; color: string }> = {
  "oid-campana": { texto: "Automático · oid_ en campaña", color: "text-success" },
  "oid-cuenta": { texto: "Automático · oid_ en cuenta", color: "text-success" },
  "numero-campana": {
    texto: "Automático · número de campaña",
    color: "text-brand-steel",
  },
  "numero-cuenta": {
    texto: "Automático · número de cuenta",
    color: "text-brand-steel",
  },
  manual: { texto: "Manual", color: "text-on-surface-variant" },
  "sin-configurar": { texto: "Sin configurar", color: "text-error" },
};

export default async function AccountsPage() {
  const supabase = await createClient();
  const [mapRes, offersRes] = await Promise.all([
    supabase
      .from("spend_map")
      .select("datasource,account_name,campaign,offer_id,origen")
      .order("datasource")
      .order("account_name")
      .order("campaign"),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);
  const filas = (mapRes.data ?? []) as SpendMap[];
  const offers = (offersRes.data ?? []) as Offer[];

  // Las que faltan por configurar, primero.
  const ordenadas = [...filas].sort(
    (a, b) => Number(a.offer_id !== null) - Number(b.offer_id !== null),
  );
  const pendientes = filas.filter((f) => f.offer_id === null).length;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Cuentas y campañas"
        descripcion="La oferta se detecta del nombre: primero oid_<ID> en la campaña, luego en la cuenta, y si no, un número que coincida con una oferta de Everflow. Cambiarla solo afecta las capturas futuras; el histórico conserva la que tenía."
      >
        <AutoRefresh segundos={120} />
      </PageHeader>

      {pendientes > 0 && (
        <div className="rounded-xl border border-warning bg-[#fff7f3] p-md text-body-md">
          <p className="font-semibold text-on-surface">
            {pendientes} combinación(es) sin oferta asignada
          </p>
          <p className="mt-1 text-on-surface-variant">
            Su gasto queda fuera del profit por oferta hasta que las asignes.
          </p>
        </div>
      )}

      <DataTable
        titulo="Mapeo plataforma · cuenta · campaña → oferta"
        icono={<Wallet className="h-5 w-5" />}
        filas={ordenadas}
        rowKey={(f) => `${f.datasource}|${f.account_name}|${f.campaign}`}
        vacio="Todavía no se ha descubierto ninguna campaña. Registra la API key de Windsor en Conexiones y ejecuta una actualización."
        sustantivo="combinaciones"
        alto="max-h-[calc(100vh-22rem)]"
        columnas={[
          {
            key: "plat",
            label: "Plataforma",
            render: (f) => platformLabel(f.datasource),
          },
          {
            key: "cuenta",
            label: "Cuenta",
            render: (f) => f.account_name || "—",
          },
          {
            key: "campana",
            label: "Campaña",
            render: (f) => f.campaign || "— (nivel cuenta)",
          },
          {
            key: "origen",
            label: "Origen del mapeo",
            render: (f) => {
              const o = ORIGENES[f.origen] ?? {
                texto: f.origen,
                color: "text-on-surface-variant",
              };
              return (
                <span className={`text-label-md ${o.color}`}>{o.texto}</span>
              );
            },
          },
          {
            key: "oferta",
            label: "Oferta",
            render: (f) => (
              <ActionForm accion={assignOffer} className="flex items-center gap-2">
                <input type="hidden" name="datasource" value={f.datasource} />
                <input type="hidden" name="account_name" value={f.account_name} />
                <input type="hidden" name="campaign" value={f.campaign} />
                <select
                  name="offer_id"
                  defaultValue={f.offer_id === null ? "" : String(f.offer_id)}
                  className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">— Sin asignar —</option>
                  {offers.map((o) => (
                    <option key={o.offer_id} value={String(o.offer_id)}>
                      {o.name || `Oferta ${o.offer_id}`} · {o.offer_id}
                    </option>
                  ))}
                </select>
                <SubmitButton className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-brand">
                  Guardar
                </SubmitButton>
              </ActionForm>
            ),
          },
        ]}
      />
    </div>
  );
}
