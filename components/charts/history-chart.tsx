"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { money } from "@/lib/format";

export type HistoryPoint = {
  day: string;
  spend: number;
  revenue: number;
  profit: number;
  conversions: number;
};

const INK = { muted: "#898781", axis: "#c3c2b7" };
const POS = "#2a78d6"; // azul: profit
const NEG = "#d03b3b"; // rojo: pérdida

/** Profit por día: barra divergente sobre la línea de cero. */
export function HistoryChart({ data }: { data: HistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fill: INK.muted, fontSize: 11 }}
          stroke={INK.axis}
          tickFormatter={(v: string) => v.slice(5)}
          minTickGap={12}
        />
        <YAxis
          tick={{ fill: INK.muted, fontSize: 11 }}
          stroke={INK.axis}
          width={64}
          tickFormatter={(v) => money(Number(v))}
        />
        <ReferenceLine y={0} stroke={INK.axis} />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as HistoryPoint;
            return (
              <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
                <p className="font-medium mb-1">{label}</p>
                <p className="text-muted-foreground">
                  Revenue{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {money(d.revenue)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Gasto{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {money(d.spend)}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Profit{" "}
                  <span
                    className="font-medium tabular-nums"
                    style={{ color: d.profit >= 0 ? POS : NEG }}
                  >
                    {money(d.profit)}
                  </span>
                </p>
              </div>
            );
          }}
        />
        {/* isAnimationActive={false}: con la animación activada recharts 3.10
            no dibuja las barras en este stack (Next 16 / React 19). */}
        <Bar
          dataKey="profit"
          name="Profit"
          fill={POS}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.day} fill={d.profit >= 0 ? POS : NEG} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
