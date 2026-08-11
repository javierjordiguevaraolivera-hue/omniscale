import {
  Activity,
  BadgeDollarSign,
  CalendarRange,
  MousePointerClick,
  Percent,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayInTz, shiftDay } from "@/lib/tz";
import { money, num } from "@/lib/format";
import { StatTile } from "@/components/stat-tile";
import { OfferSelect } from "@/components/offer-select";
import { RangeTabs } from "@/components/range-tabs";
import { Panel, PageHeader } from "@/components/panel";
import { AutoRefresh } from "@/components/auto-refresh";
import { DataTable } from "@/components/data-table";
import { HistoryChart, type HistoryPoint } from "@/components/charts/history-chart";

export const dynamic = "force-dynamic";

type SummaryRow = {
  day: string;
  offer_id: number;
  offer_name: string;
  spend: number;
  conversions: number;
  revenue: number;
  profit: number;
};

const RANGOS = [3, 7, 15, 30] as const;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string; days?: string }>;
}) {
  const sp = await searchParams;
  const days = RANGOS.includes(Number(sp.days) as (typeof RANGOS)[number])
    ? Number(sp.days)
    : 7;
  const offerFilter = sp.offer && sp.offer !== "all" ? Number(sp.offer) : null;

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("timezone")
    .eq("id", 1)
    .single();
  const tz = settings?.timezone ?? "America/New_York";
  const hoy = todayInTz(tz);
  const desde = shiftDay(hoy, -days);
  const hasta = shiftDay(hoy, -1); // el histórico llega hasta ayer

  let query = supabase
    .from("daily_summary")
    .select("*")
    .gte("day", desde)
    .lte("day", hasta)
    .order("day");
  if (offerFilter !== null) query = query.eq("offer_id", offerFilter);

  const [sumRes, offersRes] = await Promise.all([
    query,
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);
  const rows = (sumRes.data ?? []) as SummaryRow[];
  const offers = (offersRes.data ?? []) as { offer_id: number; name: string }[];

  // Serie por día (suma de ofertas)
  const porDia = new Map<string, HistoryPoint>();
  for (const r of rows) {
    const p =
      porDia.get(r.day) ??
      { day: r.day, spend: 0, revenue: 0, profit: 0, conversions: 0 };
    p.spend += Number(r.spend);
    p.revenue += Number(r.revenue);
    p.profit += Number(r.profit);
    p.conversions += Number(r.conversions);
    porDia.set(r.day, p);
  }
  const serie = [...porDia.values()].sort((a, b) => a.day.localeCompare(b.day));

  const total = serie.reduce(
    (acc, d) => ({
      spend: acc.spend + d.spend,
      revenue: acc.revenue + d.revenue,
      profit: acc.profit + d.profit,
      conversions: acc.conversions + d.conversions,
    }),
    { spend: 0, revenue: 0, profit: 0, conversions: 0 },
  );
  const cpa = total.conversions > 0 ? total.spend / total.conversions : 0;
  const roas = total.spend > 0 ? total.revenue / total.spend : 0;

  return (
    <div className="flex flex-col gap-md">
      <PageHeader
        titulo="Histórico"
        descripcion={`${desde} → ${hasta} · una fila consolidada por día y oferta`}
      >
        <AutoRefresh segundos={120} />
        <RangeTabs days={days} offer={sp.offer ?? "all"} />
        <OfferSelect
          offers={offers}
          value={sp.offer ?? "all"}
          basePath="/history"
          extraParams={{ days: String(days) }}
        />
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Gasto" value={money(total.spend)} icono={<Wallet />} />
        <StatTile label="Conversiones" value={num(total.conversions)} icono={<Activity />} />
        <StatTile label="Revenue" value={money(total.revenue)} icono={<BadgeDollarSign />} />
        <StatTile
          label="Profit / Pérdida"
          value={money(total.profit)}
          tone={total.profit > 0 ? "good" : total.profit < 0 ? "bad" : "neutral"}
          icono={<TrendingUp />}
        />
        <StatTile label="Costo por conversión" value={money(cpa)} icono={<Percent />} />
        <StatTile label="ROAS" value={`${roas.toFixed(2)}x`} icono={<MousePointerClick />} />
      </div>

      <Panel titulo="Profit por día" icono={<CalendarRange className="h-5 w-5" />}>
        <div className="p-md">
          <p className="mb-md text-label-sm text-on-surface-variant">
            Azul = ganancia, rojo = pérdida. Pasa el cursor para ver revenue y gasto.
          </p>
          {serie.length === 0 ? (
            <p className="py-lg text-body-md text-on-surface-variant">
              Todavía no hay días consolidados en este rango.
            </p>
          ) : (
            <HistoryChart data={serie} />
          )}
        </div>
      </Panel>

      <DataTable
        titulo="Detalle por día y oferta"
        icono={<CalendarRange className="h-5 w-5" />}
        filas={[...rows].reverse()}
        rowKey={(r) => `${r.day}-${r.offer_id}`}
        vacio="Sin datos consolidados en este rango."
        sustantivo="filas"
        columnas={[
          {
            key: "day",
            label: "Día",
            render: (r) => <span className="tabular-nums">{r.day}</span>,
          },
          {
            key: "offer",
            label: "Oferta",
            render: (r) =>
              r.offer_id === 0
                ? "Sin asignar"
                : r.offer_name || `Oferta ${r.offer_id}`,
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
          {
            key: "profit",
            label: "Profit",
            align: "right",
            render: (r) => (
              <span
                className={`font-semibold tabular-nums ${
                  Number(r.profit) >= 0 ? "text-success" : "text-error"
                }`}
              >
                {money(Number(r.profit))}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
