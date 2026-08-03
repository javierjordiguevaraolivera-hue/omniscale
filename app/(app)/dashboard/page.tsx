import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Layers,
  MousePointerClick,
  Percent,
  Radio,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/tz";
import { money, num, sourceLabel, platformLabel } from "@/lib/format";
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
type SpendRow = {
  datasource: string;
  account_name: string;
  campaign: string;
  clicks: number;
  spend: number;
  offer_id: number | null;
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

  const [seriesRes, osRes, spendRes, offersRes] = await Promise.all([
    supabase.rpc("intraday_series", { p_day: day, p_offer: offerFilter }),
    supabase.rpc("latest_offer_source", { p_day: day }),
    supabase.rpc("latest_spend", { p_day: day }),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);

  const series = (seriesRes.data ?? []) as SeriesRow[];
  const offers = (offersRes.data ?? []) as Offer[];
  let offerSource = (osRes.data ?? []) as OfferSourceRow[];
  let spendRows = (spendRes.data ?? []) as SpendRow[];
  if (offerFilter !== null) {
    offerSource = offerSource.filter((r) => r.offer_id === offerFilter);
    spendRows = spendRows.filter((r) => r.offer_id === offerFilter);
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
  const sinAsignar = spendRows.filter(
    (r) => r.offer_id === null && Number(r.spend) > 0,
  );

  const nombreOferta = (id: number | null) =>
    id === null
      ? "Sin asignar"
      : offers.find((o) => o.offer_id === id)?.name || `Oferta ${id}`;

  // --- Cruce por plataforma: gasto (Windsor) vs revenue (Everflow) --------
  type FilaPlataforma = {
    plataforma: string;
    spend: number;
    clicks: number;
    conversions: number;
    revenue: number;
  };
  const porPlataforma = new Map<string, FilaPlataforma>();
  const bucket = (plataforma: string) => {
    let b = porPlataforma.get(plataforma);
    if (!b) {
      b = { plataforma, spend: 0, clicks: 0, conversions: 0, revenue: 0 };
      porPlataforma.set(plataforma, b);
    }
    return b;
  };
  for (const r of spendRows) {
    const b = bucket(platformLabel(r.datasource));
    b.spend += Number(r.spend);
    b.clicks += Number(r.clicks);
  }
  for (const r of offerSource) {
    const b = bucket(sourceLabel(r.source_id));
    b.conversions += Number(r.conversions);
    b.revenue += Number(r.revenue);
  }
  const plataformas = [...porPlataforma.values()].sort(
    (a, b) => b.spend + b.revenue - (a.spend + a.revenue),
  );

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
            Registra tu API key de Everflow y la de Windsor en{" "}
            <Link href="/connections" className="text-brand-crimson underline">
              Conexiones
            </Link>
            , y usa &ldquo;Actualizar ahora&rdquo; para la primera corrida.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Gasto" value={money(spend)} icono={<Wallet />} />
        <StatTile label="Conversiones" value={num(conversions)} icono={<Activity />} />
        <StatTile label="Revenue" value={money(revenue)} icono={<BadgeDollarSign />} />
        <StatTile
          label="Profit / Pérdida"
          value={money(profit)}
          tone={profit > 0 ? "good" : profit < 0 ? "bad" : "neutral"}
          icono={<TrendingUp />}
        />
        <StatTile label="Costo por conversión" value={money(cpa)} icono={<Percent />} />
        <StatTile label="ROAS" value={`${roas.toFixed(2)}x`} icono={<MousePointerClick />} />
      </div>

      {sinAsignar.length > 0 && (
        <div className="rounded-xl border border-warning bg-[#fff7f3] p-md text-body-md">
          <p className="font-semibold text-on-surface">
            {sinAsignar.length} campaña(s) con gasto y sin oferta asignada
          </p>
          <p className="mt-1 text-on-surface-variant">
            Su gasto no se atribuye a ninguna oferta. Asígnalas en{" "}
            <Link href="/accounts" className="text-brand-crimson underline">
              Cuentas
            </Link>
            , o escribe <code>oid_&lt;ID&gt;</code> en el nombre de la campaña para
            que se mapee sola.
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
        titulo="Resumen por plataforma"
        icono={<Radio className="h-5 w-5" />}
        filas={plataformas}
        rowKey={(r) => r.plataforma}
        vacio="Sin datos de hoy."
        sustantivo="plataformas"
        columnas={[
          { key: "plat", label: "Plataforma", render: (r) => r.plataforma },
          {
            key: "spend",
            label: "Gasto",
            align: "right",
            render: (r) => <span className="tabular-nums">{money(r.spend)}</span>,
          },
          {
            key: "clicks",
            label: "Clicks",
            align: "right",
            render: (r) => <span className="tabular-nums">{num(r.clicks)}</span>,
          },
          {
            key: "cv",
            label: "Conversiones",
            align: "right",
            render: (r) => <span className="tabular-nums">{num(r.conversions)}</span>,
          },
          {
            key: "revenue",
            label: "Revenue",
            align: "right",
            render: (r) => <span className="tabular-nums">{money(r.revenue)}</span>,
          },
          {
            key: "cpa",
            label: "CPA",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">
                {r.conversions > 0 ? money(r.spend / r.conversions) : "—"}
              </span>
            ),
          },
          {
            key: "profit",
            label: "Profit",
            align: "right",
            render: (r) => {
              const p = r.revenue - r.spend;
              return (
                <span
                  className={`font-semibold tabular-nums ${p >= 0 ? "text-success" : "text-error"}`}
                >
                  {money(p)}
                </span>
              );
            },
          },
        ]}
      />

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
        titulo="Gasto por cuenta y campaña"
        icono={<Wallet className="h-5 w-5" />}
        filas={spendRows}
        rowKey={(r) => `${r.datasource}|${r.account_name}|${r.campaign}`}
        vacio="Sin gasto capturado hoy."
        sustantivo="campañas"
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
            key: "plat",
            label: "Plataforma",
            render: (r) => platformLabel(r.datasource),
          },
          {
            key: "cuenta",
            label: "Cuenta",
            render: (r) => r.account_name || "—",
          },
          {
            key: "campana",
            label: "Campaña",
            render: (r) => r.campaign || "—",
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
            key: "spend",
            label: "Gasto",
            align: "right",
            render: (r) => (
              <span className="tabular-nums">{money(Number(r.spend))}</span>
            ),
          },
          {
            key: "offer",
            label: "Oferta asignada",
            render: (r) =>
              r.offer_id === null ? (
                <span className="font-semibold text-error">⚠ Sin configurar</span>
              ) : (
                nombreOferta(r.offer_id)
              ),
          },
        ]}
      />
    </div>
  );
}
