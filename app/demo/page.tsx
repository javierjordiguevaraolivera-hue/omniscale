import {
  Activity,
  BadgeDollarSign,
  CalendarRange,
  Layers,
  MousePointerClick,
  Percent,
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

type FilaCuenta = {
  id: string;
  nombre: string;
  spend: number;
  oferta: string | null;
  auto: boolean;
};

const cuentas: FilaCuenta[] = [
  { id: "act_1029384756", nombre: "001 - vida hs oid_3560", spend: 512.4, oferta: "Seguro de Vida IUL", auto: true },
  { id: "act_1029384757", nombre: "002 - auto hs oid_3560", spend: 383.15, oferta: "Seguro de Vida IUL", auto: true },
  { id: "act_1029384758", nombre: "005 - final expense oid_4690", spend: 208.9, oferta: "Gastos Finales", auto: true },
  { id: "act_1029384759", nombre: "BM3 - cuenta nueva", spend: 100.05, oferta: null, auto: false },
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
          <StatTile label="Gasto" value={money(spend)} icono={<Wallet className="h-5 w-5" />} />
          <StatTile label="Conversiones" value={num(conversions)} icono={<Activity className="h-5 w-5" />} />
          <StatTile label="Revenue" value={money(revenue)} icono={<BadgeDollarSign className="h-5 w-5" />} />
          <StatTile
            label="Profit / Pérdida"
            value={money(profit)}
            tone="good"
            icono={<TrendingUp className="h-5 w-5" />}
          />
          <StatTile
            label="Costo por conversión"
            value={money(spend / conversions)}
            icono={<Percent className="h-5 w-5" />}
          />
          <StatTile
            label="ROAS"
            value={`${(revenue / spend).toFixed(2)}x`}
            icono={<MousePointerClick className="h-5 w-5" />}
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
          titulo="Cuentas publicitarias de hoy"
          icono={<Wallet className="h-5 w-5" />}
          filas={cuentas}
          rowKey={(c) => c.id}
          vacio="Sin cuentas capturadas hoy."
          sustantivo="cuentas"
          columnas={[
            {
              key: "cuenta",
              label: "Cuenta",
              render: (c) => (
                <div>
                  <span>{c.nombre}</span>
                  <span className="block text-label-sm text-on-surface-variant">
                    {c.id}
                  </span>
                </div>
              ),
            },
            {
              key: "spend",
              label: "Gasto",
              align: "right",
              render: (c) => <span className="tabular-nums">{money(c.spend)}</span>,
            },
            {
              key: "oferta",
              label: "Oferta asignada",
              render: (c) =>
                c.oferta === null ? (
                  <span className="font-semibold text-error">⚠ Sin configurar</span>
                ) : (
                  c.oferta
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
