/**
 * Página temporal solo para revisar los colores de MoneyChart con datos que
 * cruzan el cero. Se puede borrar.
 */
import { MoneyChart, type Point } from "@/components/charts/intraday-charts";

function serie(profits: number[]): Point[] {
  return profits.map((profit, i) => ({
    t: i,
    hora: `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    spend: 120 + i * 34,
    conversions: 0,
    cpa: null,
    revenue: 120 + i * 34 + profit,
    profit,
  }));
}

const CASOS = [
  { titulo: "Cruza el cero (profit → pérdida)", data: serie([40, 90, 120, 60, -30, -110, -180]) },
  { titulo: "Siempre en profit", data: serie([40, 90, 120, 160, 210, 260, 300]) },
  { titulo: "Siempre en pérdida", data: serie([-20, -60, -90, -140, -180, -220, -260]) },
  { titulo: "Plano en cero", data: serie([0, 0, 0, 0, 0, 0, 0]) },
];

export default function DemoColores() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 p-10">
      {CASOS.map((c) => (
        <section key={c.titulo}>
          <h2 className="mb-3 text-sm font-semibold">{c.titulo}</h2>
          <MoneyChart data={c.data} />
        </section>
      ))}
    </div>
  );
}
