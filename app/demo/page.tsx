import { OperationChart, MoneyChart, type Point } from "@/components/charts/intraday-charts";
import { HistoryChart, type HistoryPoint } from "@/components/charts/history-chart";
import { StatTile } from "@/components/stat-tile";
import { money } from "@/lib/format";

// Vista de muestra con datos inventados: sirve para revisar el diseño de los
// gráficos sin depender de Supabase. Se puede borrar (carpeta app/demo).
const puntos: Point[] = Array.from({ length: 120 }, (_, i) => {
  const spend = 40 + i * 3.2 + Math.sin(i / 6) * 18;
  const conversions = Math.floor(i * 0.35 + Math.sin(i / 9) * 2);
  const revenue = conversions * 46 + Math.sin(i / 5) * 30;
  const h = 8 + Math.floor(i / 12);
  const m = (i % 12) * 5;
  return {
    t: i,
    hora: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    spend,
    conversions,
    cpa: conversions > 0 ? spend / conversions : null,
    revenue,
    profit: revenue - spend,
  };
});

const historico: HistoryPoint[] = [
  { day: "2026-07-27", spend: 820, revenue: 1180, profit: 360, conversions: 26 },
  { day: "2026-07-28", spend: 910, revenue: 780, profit: -130, conversions: 18 },
  { day: "2026-07-29", spend: 1040, revenue: 1620, profit: 580, conversions: 35 },
  { day: "2026-07-30", spend: 980, revenue: 940, profit: -40, conversions: 21 },
  { day: "2026-07-31", spend: 1130, revenue: 1890, profit: 760, conversions: 41 },
  { day: "2026-08-01", spend: 1210, revenue: 2140, profit: 930, conversions: 46 },
  { day: "2026-08-02", spend: 1160, revenue: 1330, profit: 170, conversions: 29 },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-muted p-8 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="rounded-2xl border border-[#ec835a] bg-[#fff7f3] p-4 text-sm">
        <p className="font-medium">Vista de muestra</p>
        <p className="text-muted-foreground mt-1">
          Los números son inventados. Sirve para revisar el diseño de los gráficos
          antes de conectar las credenciales.
        </p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatTile label="Gasto" value={money(1204.5)} />
        <StatTile label="Conversiones" value="42" />
        <StatTile label="Revenue" value={money(1932)} />
        <StatTile label="Profit / Pérdida" value={money(727.5)} tone="good" />
        <StatTile label="Costo por conversión" value={money(28.68)} hint="ROAS 1.60x" />
      </div>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Evolución operativa</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Gasto, conversiones y costo por conversión a lo largo del día.
        </p>
        <OperationChart data={puntos} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Revenue, gasto y profit</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Las tres variables en dólares sobre el mismo eje.
        </p>
        <MoneyChart data={puntos} />
      </section>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Profit por día</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Azul = ganancia, rojo = pérdida.
        </p>
        <HistoryChart data={historico} />
      </section>
    </div>
  );
}
