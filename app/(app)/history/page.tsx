import { createClient } from "@/lib/supabase/server";
import { todayInTz, shiftDay } from "@/lib/tz";
import { money, num } from "@/lib/format";
import { StatTile } from "@/components/stat-tile";
import { OfferSelect } from "@/components/offer-select";
import { RangeTabs } from "@/components/range-tabs";
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Histórico</h1>
          <p className="text-sm text-muted-foreground">
            {desde} → {hasta} · una fila consolidada por día y oferta
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeTabs days={days} offer={sp.offer ?? "all"} />
          <OfferSelect
            offers={offers}
            value={sp.offer ?? "all"}
            basePath="/history"
            extraParams={{ days: String(days) }}
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatTile label="Gasto" value={money(total.spend)} />
        <StatTile label="Conversiones" value={num(total.conversions)} />
        <StatTile label="Revenue" value={money(total.revenue)} />
        <StatTile
          label="Profit / Pérdida"
          value={money(total.profit)}
          tone={total.profit > 0 ? "good" : total.profit < 0 ? "bad" : "neutral"}
        />
        <StatTile
          label="Costo por conversión"
          value={money(cpa)}
          hint={`ROAS ${roas.toFixed(2)}x`}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Profit por día</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Azul = ganancia, rojo = pérdida. Pasa el cursor para ver revenue y gasto.
        </p>
        {serie.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            Todavía no hay días consolidados en este rango.
          </p>
        ) : (
          <HistoryChart data={serie} />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-4">Detalle por día y oferta</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Día</th>
                <th className="py-2 pr-4 font-medium">Oferta</th>
                <th className="py-2 pr-4 font-medium text-right">Gasto</th>
                <th className="py-2 pr-4 font-medium text-right">Conversiones</th>
                <th className="py-2 pr-4 font-medium text-right">Revenue</th>
                <th className="py-2 font-medium text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground">
                    Sin datos consolidados en este rango.
                  </td>
                </tr>
              )}
              {[...rows].reverse().map((r) => (
                <tr
                  key={`${r.day}-${r.offer_id}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2 pr-4 tabular-nums">{r.day}</td>
                  <td className="py-2 pr-4">
                    {r.offer_id === 0
                      ? "Sin asignar"
                      : r.offer_name || `Oferta ${r.offer_id}`}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {money(Number(r.spend))}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {num(Number(r.conversions))}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {money(Number(r.revenue))}
                  </td>
                  <td
                    className="py-2 text-right tabular-nums font-medium"
                    style={{
                      color: Number(r.profit) >= 0 ? "#006300" : "#d03b3b",
                    }}
                  >
                    {money(Number(r.profit))}
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
