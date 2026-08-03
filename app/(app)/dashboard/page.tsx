import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Layers,
  MousePointerClick,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/tz";
import { money, num, sourceLabel } from "@/lib/format";
import { StatTile } from "@/components/stat-tile";
import { RunNowButton } from "@/components/run-now-button";
import { OfferSelect } from "@/components/offer-select";
import { Panel, PageHeader } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import {
  OperationChart,
  MoneyChart,
  type Point,
} from "@/components/charts/intraday-charts";

export const dynamic = "force-dynamic";

type SeriesRow = {
  captured_at: string;
  spend: number;
  conversions: number;
  revenue: number;
};
type OfferSourceRow = {
  offer_id: number;
  offer_name: string;
  source_id: string;
  clicks: number;
  conversions: number;
  revenue: number;
};
type AccountRow = {
  account_id: string;
  account_name: string;
  offer_id: number | null;
  spend: number;
};
type Offer = { offer_id: number; name: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const { offer } = await searchParams;
  const offerFilter = offer && offer !== "all" ? Number(offer) : null;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("timezone")
    .eq("id", 1)
    .single();
  const tz = settings?.timezone ?? "America/New_York";
  const day = todayInTz(tz);

  const [seriesRes, osRes, accRes, offersRes] = await Promise.all([
    supabase.rpc("intraday_series", { p_day: day, p_offer: offerFilter }),
    supabase.rpc("latest_offer_source", { p_day: day }),
    supabase.rpc("latest_accounts", { p_day: day }),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);

  const series = (seriesRes.data ?? []) as SeriesRow[];
  const offers = (offersRes.data ?? []) as Offer[];
  let offerSource = (osRes.data ?? []) as OfferSourceRow[];
  let accounts = (accRes.data ?? []) as AccountRow[];
  if (offerFilter !== null) {
    offerSource = offerSource.filter((r) => r.offer_id === offerFilter);
    accounts = accounts.filter((r) => r.offer_id === offerFilter);
  }

  const puntos: Point[] = series.map((r) => {
    const spend = Number(r.spend);
    const conversions = Number(r.conversions);
    const revenue = Number(r.revenue);
    const d = new Date(r.captured_at);
    return {
      t: d.getTime(),
      hora: new Intl.DateTimeFormat("es-PE", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d),
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : null,
      revenue,
      profit: revenue - spend,
    };
  });

  const ultimo = puntos.at(-1);
  const spend = ultimo?.spend ?? 0;
  const conversions = ultimo?.conversions ?? 0;
  const revenue = ultimo?.revenue ?? 0;
  const profit = revenue - spend;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const sinAsignar = accounts.filter((a) => a.offer_id === null && a.spend > 0);

  const nombreOferta = (id: number | null) =>
    id === null
      ? "Sin asignar"
      : offers.find((o) => o.offer_id === id)?.name || `Oferta ${id}`;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo={`Hoy · ${day}`}
        descripcion={
          ultimo
            ? `Zona horaria ${tz} · última captura ${ultimo.hora}`
            : `Zona horaria ${tz} · sin capturas todavía`
        }
      >
        <OfferSelect offers={offers} value={offer ?? "all"} basePath="/dashboard" />
        <RunNowButton />
      </PageHeader>

      {puntos.length === 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md text-body-md">
          <p className="font-semibold text-on-surface">
            Todavía no hay capturas de hoy.
          </p>
          <p className="mt-1 text-on-surface-variant">
            Registra tu API key de Everflow y los tokens de Facebook en{" "}
            <Link href="/connections" className="text-brand-crimson underline">
              Conexiones
            </Link>
            , y usa &ldquo;Actualizar ahora&rdquo; para la primera corrida.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Gasto" value={money(spend)} icono={<Wallet className="h-5 w-5" />} />
        <StatTile label="Conversiones" value={num(conversions)} icono={<Activity className="h-5 w-5" />} />
        <StatTile label="Revenue" value={money(revenue)} icono={<BadgeDollarSign className="h-5 w-5" />} />
        <StatTile
          label="Profit / Pérdida"
          value={money(profit)}
          tone={profit > 0 ? "good" : profit < 0 ? "bad" : "neutral"}
          icono={<TrendingUp className="h-5 w-5" />}
        />
        <StatTile label="Costo por conversión" value={money(cpa)} icono={<Percent className="h-5 w-5" />} />
        <StatTile label="ROAS" value={`${roas.toFixed(2)}x`} icono={<MousePointerClick className="h-5 w-5" />} />
      </div>

      {sinAsignar.length > 0 && (
        <div className="rounded-xl border border-warning bg-[#fff7f3] p-md text-body-md">
          <p className="font-semibold text-on-surface">
            {sinAsignar.length} cuenta(s) con gasto y sin oferta asignada
          </p>
          <p className="mt-1 text-on-surface-variant">
            Su gasto no se atribuye a ninguna oferta. Asígnalas en{" "}
            <Link href="/accounts" className="text-brand-crimson underline">
              Cuentas
            </Link>
            , o agrega <code>oid_&lt;ID&gt;</code> al nombre de la cuenta en
            Facebook para que se mapee sola.
          </p>
        </div>
      )}

      <Panel titulo="Evolución operativa" icono={<Activity className="h-5 w-5" />}>
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Gasto, conversiones y costo por conversión a lo largo del día.
          </p>
          <OperationChart data={puntos} />
        </div>
      </Panel>

      <Panel titulo="Revenue, gasto y profit" icono={<TrendingUp className="h-5 w-5" />}>
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Las tres variables en dólares sobre el mismo eje.
          </p>
          <MoneyChart data={puntos} />
        </div>
      </Panel>

      <DataTable
        titulo="Por oferta y plataforma"
        icono={<Layers className="h-5 w-5" />}
        filas={offerSource}
        rowKey={(r) => `${r.offer_id}-${r.source_id}`}
        vacio="Sin conversiones registradas hoy."
        sustantivo="filas"
        columnas={[
          {
            key: "offer",
            label: "Oferta",
            render: (r) => (
              <>
                {r.offer_name || `Oferta ${r.offer_id}`}
                <span className="text-on-surface-variant"> · {r.offer_id}</span>
              </>
            ),
          },
          {
            key: "source",
            label: "Plataforma",
            render: (r) => sourceLabel(r.source_id),
          },
          {
            key: "clicks",
            label: "Clicks",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">{num(Number(r.clicks))}</span>
            ),
          },
          {
            key: "cv",
            label: "Conversiones",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">{num(Number(r.conversions))}</span>
            ),
          },
          {
            key: "revenue",
            label: "Revenue",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">{money(Number(r.revenue))}</span>
            ),
          },
        ]}
      />

      <DataTable
        titulo="Cuentas publicitarias de hoy"
        icono={<Wallet className="h-5 w-5" />}
        filas={accounts}
        rowKey={(a) => a.account_id}
        vacio="Sin cuentas capturadas hoy."
        sustantivo="cuentas"
        acciones={
          <Link
            href="/accounts"
            className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-xs text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Asignar ofertas
          </Link>
        }
        columnas={[
          {
            key: "account",
            label: "Cuenta",
            render: (a) => (
              <div>
                <span>{a.account_name || a.account_id}</span>
                <span className="block text-label-sm text-on-surface-variant">
                  {a.account_id}
                </span>
              </div>
            ),
          },
          {
            key: "spend",
            label: "Gasto",
            align: "right",
            render: (a) => (
              <span className="tabular-nums">{money(Number(a.spend))}</span>
            ),
          },
          {
            key: "offer",
            label: "Oferta asignada",
            render: (a) =>
              a.offer_id === null ? (
                <span className="font-semibold text-error">⚠ Sin configurar</span>
              ) : (
                nombreOferta(a.offer_id)
              ),
          },
        ]}
      />
    </div>
  );
}
