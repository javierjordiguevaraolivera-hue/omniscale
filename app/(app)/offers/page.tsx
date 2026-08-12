import { Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/tz";
import { saveOffer } from "@/app/actions";
import { PageHeader } from "@/components/panel";
import { AutoRefresh } from "@/components/auto-refresh";
import { DataTable } from "@/components/data-table";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { money, num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Offer = {
  offer_id: number;
  name: string;
  conversion_type: string | null;
  active: boolean;
};

type OfferSourceRow = {
  offer_id: number;
  conversions: number;
  revenue: number;
};

const TIPOS = [
  { valor: "lead", texto: "Lead" },
  { valor: "llamada", texto: "Llamada" },
  { valor: "registro", texto: "Registro" },
  { valor: "otro", texto: "Otro" },
];

export default async function OffersPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("timezone")
    .eq("id", 1)
    .single();
  const day = todayInTz(settings?.timezone ?? "America/New_York");

  const [offersRes, osRes] = await Promise.all([
    supabase
      .from("offers")
      .select("offer_id,name,conversion_type,active")
      .order("offer_id"),
    supabase.rpc("latest_offer_source", { p_day: day }),
  ]);

  const faltaMigracion = Boolean(offersRes.error);
  const offers = (offersRes.data ?? []) as Offer[];
  const hoy = (osRes.data ?? []) as OfferSourceRow[];

  // Payout efectivo = revenue ÷ conversiones de hoy. No es configuración: sale
  // medido de Everflow. Sirve de alarma — si sabes que una oferta paga $15 y aquí
  // sale $12.40, hay conversiones que no pagaron o el tracking está a medias.
  const medidoPorOferta = new Map<number, { cv: number; revenue: number }>();
  for (const r of hoy) {
    const b = medidoPorOferta.get(r.offer_id) ?? { cv: 0, revenue: 0 };
    b.cv += Number(r.conversions);
    b.revenue += Number(r.revenue);
    medidoPorOferta.set(r.offer_id, b);
  }

  // Las que faltan por configurar, primero.
  const ordenadas = [...offers].sort(
    (a, b) =>
      Number(a.conversion_type !== null) - Number(b.conversion_type !== null) ||
      a.offer_id - b.offer_id,
  );
  const sinTipo = offers.filter((o) => o.conversion_type === null).length;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Ofertas"
        descripcion="El catálogo se llena solo desde Everflow. Aquí se configura qué tipo de conversión paga cada oferta y si sigue activa. El payout no se guarda: viene medido de Everflow."
      >
        <AutoRefresh segundos={120} />
      </PageHeader>

      {faltaMigracion && (
        <div className="rounded-xl border border-error bg-error-container p-md text-body-md">
          <p className="font-semibold text-on-surface">
            Falta ejecutar la migración <code>0007</code>
          </p>
          <p className="mt-1 text-on-surface-variant">
            Las columnas <code>conversion_type</code> y <code>active</code> de{" "}
            <code>offers</code> todavía no existen. Pégala en el SQL Editor de
            Supabase.
          </p>
        </div>
      )}

      {sinTipo > 0 && !faltaMigracion && (
        <p className="text-body-md text-on-surface-variant">
          {num(sinTipo)} oferta(s) sin tipo de conversión configurado.
        </p>
      )}

      <DataTable
        titulo="Catálogo de ofertas"
        icono={<Tags className="h-5 w-5" />}
        filas={ordenadas}
        rowKey={(o) => String(o.offer_id)}
        vacio="Todavía no se ha descubierto ninguna oferta. Registra la API key de Everflow en Conexiones y ejecuta una actualización."
        sustantivo="ofertas"
        columnas={[
          {
            key: "nombre",
            label: "Oferta",
            render: (o) => (
              <span className={o.active ? "" : "text-on-surface-variant"}>
                {o.name || `Oferta ${o.offer_id}`}
              </span>
            ),
          },
          {
            key: "id",
            label: "ID",
            render: (o) => (
              <span className="font-mono text-label-sm text-on-surface-variant">
                {o.offer_id}
              </span>
            ),
          },
          {
            key: "medido",
            label: "Payout efectivo hoy",
            align: "right",
            render: (o) => {
              const m = medidoPorOferta.get(o.offer_id);
              if (!m || m.cv === 0) {
                return <span className="text-on-surface-variant">—</span>;
              }
              return (
                <span className="tabular-nums">
                  {money(m.revenue / m.cv)}
                  <span className="ml-1 text-label-sm text-on-surface-variant">
                    · {num(m.cv)} cv
                  </span>
                </span>
              );
            },
          },
          {
            key: "config",
            label: "Tipo de conversión y estado",
            render: (o) => (
              <ActionForm accion={saveOffer} className="flex items-center gap-2">
                <input type="hidden" name="offer_id" value={o.offer_id} />
                <select
                  name="conversion_type"
                  defaultValue={o.conversion_type ?? ""}
                  className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">— Sin configurar —</option>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.texto}
                    </option>
                  ))}
                </select>
                <select
                  name="active"
                  defaultValue={String(o.active)}
                  className="h-9 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
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
