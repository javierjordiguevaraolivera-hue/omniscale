import {
  Activity,
  BadgeDollarSign,
  CalendarRange,
  Layers,
  MousePointerClick,
  Percent,
  Radio,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Sidebar } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/panel";
import { DataTable } from "@/components/data-table";
import { StatTile } from "@/components/stat-tile";
import { money, num } from "@/lib/format";
import {
  OperationChart,
  MoneyChart,
  type Point,
} from "@/components/charts/intraday-charts";
import { HistoryChart, type HistoryPoint } from "@/components/charts/history-chart";

// Vista de muestra con datos inventados: sirve para revisar el diseño del panel
// completo (sidebar, tarjetas, tablas y gráficos) sin depender de Supabase.
// Se puede borrar la carpeta app/demo cuando ya no haga falta.

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

type FilaOferta = {
  offer: string;
  offerId: number;
  source: string;
  clicks: number;
  cv: number;
  revenue: number;
};

const porOferta: FilaOferta[] = [
  { offer: "Seguro de Vida IUL", offerId: 3560, source: "Facebook", clicks: 4210, cv: 28, revenue: 1288 },
  { offer: "Seguro de Vida IUL", offerId: 3560, source: "TikTok", clicks: 1870, cv: 9, revenue: 414 },
  { offer: "Seguro de Vida IUL", offerId: 3560, source: "Google", clicks: 640, cv: 4, revenue: 184 },
  { offer: "Gastos Finales", offerId: 4690, source: "Facebook", clicks: 2050, cv: 11, revenue: 506 },
  { offer: "Gastos Finales", offerId: 4690, source: "Desconocido", clicks: 190, cv: 1, revenue: 46 },
];

type FilaGasto = {
  plataforma: string;
  cuenta: string;
  campana: string;
  clicks: number;
  spend: number;
  oferta: string | null;
};

const gasto: FilaGasto[] = [
  { plataforma: "TikTok", cuenta: "M.S-T.I#41 - AM - 3876", campana: "Leads - Tradicional - 3560", clicks: 24, spend: 38.05, oferta: "Seguro de Vida IUL" },
  { plataforma: "TikTok", cuenta: "M.S-T.I#43 - AM", campana: "27/07 - GVL - 3560 - BROAD", clicks: 11, spend: 22.73, oferta: "Seguro de Vida IUL" },
  { plataforma: "Facebook", cuenta: "BM2 - Vida", campana: "01/08 - oid_3560 - ABO", clicks: 980, spend: 512.4, oferta: "Seguro de Vida IUL" },
  { plataforma: "Facebook", cuenta: "BM2 - Finales", campana: "02/08 - oid_4690 - CBO", clicks: 640, spend: 208.9, oferta: "Gastos Finales" },
  { plataforma: "Google", cuenta: "Ads - Principal", campana: "Search - marca", clicks: 210, spend: 100.05, oferta: null },
];

type FilaPlataforma = {
  plataforma: string;
  spend: number;
  clicks: number;
  cv: number;
  revenue: number;
};

const plataformas: FilaPlataforma[] = [
  { plataforma: "Facebook", spend: 721.3, clicks: 1620, cv: 39, revenue: 1794 },
  { plataforma: "TikTok", spend: 60.78, clicks: 35, cv: 9, revenue: 414 },
  { plataforma: "Google", spend: 100.05, clicks: 210, cv: 4, revenue: 184 },
  { plataforma: "Desconocido", spend: 0, clicks: 0, cv: 1, revenue: 46 },
];

export default function Page() {
  const spend = 1204.5;
  const conversions = 53;
  const revenue = 2438;
  const profit = revenue - spend;

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface">
      <Sidebar email="antony@ecomfylead.com" />
      <main className="ml-[260px] flex min-h-screen flex-col gap-md px-lg pb-lg pt-lg">
        <div className="rounded-xl border border-warning bg-[#fff7f3] p-md text-body-md">
          <p className="font-semibold text-on-surface">Vista de muestra</p>
          <p className="mt-1 text-on-surface-variant">
            Los números son inventados. Sirve para revisar el diseño del panel
            antes de conectar las credenciales.
          </p>
        </div>

        <PageHeader
          titulo="Hoy · 2026-08-03"
          descripcion="Zona horaria America/New_York · última captura 17:55"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Gasto" value={money(spend)} icono={<Wallet />} />
          <StatTile label="Conversiones" value={num(conversions)} icono={<Activity />} />
          <StatTile label="Revenue" value={money(revenue)} icono={<BadgeDollarSign />} />
          <StatTile
            label="Profit / Pérdida"
            value={money(profit)}
            tone="good"
            icono={<TrendingUp />}
          />
          <StatTile
            label="Costo por conversión"
            value={money(spend / conversions)}
            icono={<Percent />}
          />
          <StatTile
            label="ROAS"
            value={`${(revenue / spend).toFixed(2)}x`}
            icono={<MousePointerClick />}
          />
        </div>

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
          filas={porOferta}
          rowKey={(r) => `${r.offerId}-${r.source}`}
          vacio="Sin conversiones registradas hoy."
          sustantivo="filas"
          columnas={[
            {
              key: "offer",
              label: "Oferta",
              render: (r) => (
                <>
                  {r.offer}
                  <span className="text-on-surface-variant"> · {r.offerId}</span>
                </>
              ),
            },
            { key: "source", label: "Plataforma", render: (r) => r.source },
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
              render: (r) => <span className="tabular-nums">{num(r.cv)}</span>,
            },
            {
              key: "revenue",
              label: "Revenue",
              align: "right",
              render: (r) => <span className="tabular-nums">{money(r.revenue)}</span>,
            },
          ]}
        />

        <DataTable
          titulo="Resumen por plataforma"
          icono={<Radio className="h-5 w-5" />}
          filas={plataformas}
          rowKey={(p) => p.plataforma}
          vacio="Sin datos de hoy."
          sustantivo="plataformas"
          columnas={[
            { key: "plat", label: "Plataforma", render: (p) => p.plataforma },
            {
              key: "spend",
              label: "Gasto",
              align: "right",
              render: (p) => <span className="tabular-nums">{money(p.spend)}</span>,
            },
            {
              key: "clicks",
              label: "Clicks",
              align: "right",
              render: (p) => <span className="tabular-nums">{num(p.clicks)}</span>,
            },
            {
              key: "cv",
              label: "Conversiones",
              align: "right",
              render: (p) => <span className="tabular-nums">{num(p.cv)}</span>,
            },
            {
              key: "revenue",
              label: "Revenue",
              align: "right",
              render: (p) => <span className="tabular-nums">{money(p.revenue)}</span>,
            },
            {
              key: "cpa",
              label: "CPA",
              align: "right",
              render: (p) => (
                <span className="tabular-nums">
                  {p.cv > 0 ? money(p.spend / p.cv) : "—"}
                </span>
              ),
            },
            {
              key: "profit",
              label: "Profit",
              align: "right",
              render: (p) => {
                const v = p.revenue - p.spend;
                return (
                  <span
                    className={`font-semibold tabular-nums ${v >= 0 ? "text-success" : "text-error"}`}
                  >
                    {money(v)}
                  </span>
                );
              },
            },
          ]}
        />

        <DataTable
          titulo="Gasto por cuenta y campaña"
          icono={<Wallet className="h-5 w-5" />}
          filas={gasto}
          rowKey={(g) => `${g.plataforma}|${g.cuenta}|${g.campana}`}
          vacio="Sin gasto capturado hoy."
          sustantivo="campañas"
          columnas={[
            { key: "plat", label: "Plataforma", render: (g) => g.plataforma },
            { key: "cuenta", label: "Cuenta", render: (g) => g.cuenta },
            { key: "campana", label: "Campaña", render: (g) => g.campana },
            {
              key: "clicks",
              label: "Clicks",
              align: "right",
              render: (g) => <span className="tabular-nums">{num(g.clicks)}</span>,
            },
            {
              key: "spend",
              label: "Gasto",
              align: "right",
              render: (g) => <span className="tabular-nums">{money(g.spend)}</span>,
            },
            {
              key: "oferta",
              label: "Oferta asignada",
              render: (g) =>
                g.oferta === null ? (
                  <span className="font-semibold text-error">⚠ Sin configurar</span>
                ) : (
                  g.oferta
                ),
            },
          ]}
        />

        <Panel titulo="Profit por día" icono={<CalendarRange className="h-5 w-5" />}>
          <div className="p-md">
            <p className="mb-md text-label-sm text-on-surface-variant">
              Azul = ganancia, rojo = pérdida.
            </p>
            <HistoryChart data={historico} />
          </div>
        </Panel>
      </main>
    </div>
  );
}
