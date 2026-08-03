"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, num } from "@/lib/format";

export type Point = {
  t: number; // epoch ms
  hora: string;
  spend: number;
  conversions: number;
  cpa: number | null;
  revenue: number;
  profit: number;
};

const SERIES = {
  spend: "#eb6834", // slot 2 - naranja
  conversions: "#2a78d6", // slot 1 - azul
  cpa: "#1baf7a", // slot 3 - aqua
  revenue: "#2a78d6",
  profit: "#1baf7a",
};

const INK = { muted: "#898781", grid: "#e1e0d9", axis: "#c3c2b7" };

const ejeX = {
  dataKey: "hora" as const,
  tick: { fill: INK.muted, fontSize: 11 },
  stroke: INK.axis,
  minTickGap: 40,
};

function TooltipBox({
  active,
  payload,
  label,
  formato,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  formato: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: p.color }}
          />
          <span>{p.name}</span>
          <span className="ml-auto font-medium text-foreground tabular-nums">
            {formato(Number(p.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Gráfico 1 - small multiples: gasto, conversiones y costo por conversión.
 * Van en paneles separados porque son magnitudes distintas (nunca dos ejes Y).
 */
export function OperationChart({ data }: { data: Point[] }) {
  const paneles = [
    {
      key: "spend" as const,
      titulo: "Gasto",
      color: SERIES.spend,
      formato: money,
    },
    {
      key: "conversions" as const,
      titulo: "Conversiones",
      color: SERIES.conversions,
      formato: num,
    },
    {
      key: "cpa" as const,
      titulo: "Costo por conversión",
      color: SERIES.cpa,
      formato: money,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {paneles.map((p) => {
        const ultimo = [...data].reverse().find((d) => d[p.key] !== null);
        const valor = ultimo ? Number(ultimo[p.key] ?? 0) : 0;
        return (
          <div key={p.key}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {p.titulo}
              </span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: p.color }}
              >
                {p.formato(valor)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <XAxis {...ejeX} />
                <YAxis
                  tick={{ fill: INK.muted, fontSize: 10 }}
                  stroke={INK.axis}
                  width={48}
                  tickFormatter={(v) => p.formato(Number(v))}
                />
                <Tooltip
                  content={<TooltipBox formato={p.formato} />}
                  cursor={{ stroke: INK.axis, strokeDasharray: "3 3" }}
                />
                <Line
                  type="monotone"
                  dataKey={p.key}
                  name={p.titulo}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

/** Gráfico 2 - revenue, gasto y profit/pérdida (todos en USD, un solo eje). */
export function MoneyChart({ data }: { data: Point[] }) {
  const series = [
    { key: "revenue" as const, nombre: "Revenue", color: SERIES.revenue },
    { key: "spend" as const, nombre: "Gasto", color: SERIES.spend },
    { key: "profit" as const, nombre: "Profit / Pérdida", color: SERIES.profit },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="inline-block w-3 h-1.5 rounded-sm"
              style={{ background: s.color }}
            />
            {s.nombre}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <XAxis {...ejeX} />
          <YAxis
            tick={{ fill: INK.muted, fontSize: 11 }}
            stroke={INK.axis}
            width={64}
            tickFormatter={(v) => money(Number(v))}
          />
          <ReferenceLine y={0} stroke={INK.axis} strokeWidth={1} />
          <Tooltip
            content={<TooltipBox formato={money} />}
            cursor={{ stroke: INK.axis, strokeDasharray: "3 3" }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.nombre}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
