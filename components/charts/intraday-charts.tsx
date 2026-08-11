"use client";

import { useId } from "react";
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

/**
 * Colores de las series.
 *
 * El profit no tiene un color fijo: va en VERDE por encima de cero y en ROJO
 * por debajo, con un degradado que corta exactamente en la línea del cero (ver
 * MoneyChart). El signo también se ve por la posición respecto a ese cero, así
 * que la información no depende solo del color — importa para quien no
 * distingue verde de rojo.
 *
 * El gasto va en VIOLETA y con línea discontinua a propósito: el naranja de
 * antes se confundía con el rojo de la pérdida, y el trazo discontinuo lo separa
 * del azul del revenue sin depender del tono.
 */
const SERIES = {
  revenue: "#2a78d6", // azul
  spend: "#7c3aed", // violeta
  ganancia: "#0ca30c", // verde: profit positivo
  perdida: "#d03b3b", // rojo: pérdida
  conversions: "#2a78d6",
  cpa: "#1baf7a",
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
  porSigno,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
  formato: (v: number) => string;
  /** dataKeys cuyo color se decide por el signo del valor (profit). */
  porSigno?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => {
        const valor = Number(p.value ?? 0);
        // El profit se pinta con un degradado (stroke = url(#…)), que no sirve
        // como color de muestra: aquí se resuelve al verde o rojo que toca.
        const color = porSigno?.includes(String(p.dataKey))
          ? valor < 0
            ? SERIES.perdida
            : SERIES.ganancia
          : p.color;
        return (
          <p key={i} className="flex items-center gap-2 text-muted-foreground">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <span>{p.name}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">
              {formato(valor)}
            </span>
          </p>
        );
      })}
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

/**
 * Dónde cae el $0 dentro de la caja que ocupa la línea del profit, contado
 * desde arriba (0 = arriba, 1 = abajo).
 *
 * El degradado usa objectBoundingBox, o sea que su y=0 es el valor más alto de
 * la serie y su y=1 el más bajo. Por eso el corte no depende del dominio del
 * eje ni de los márgenes: se calcula solo con el máximo y el mínimo del profit.
 *
 * Devuelve null cuando la línea es plana (caja de alto cero): ahí un degradado
 * objectBoundingBox no se pinta, así que hay que usar un color sólido.
 */
function corteEnCero(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  if (max === min) return null;
  return Math.min(1, Math.max(0, max / (max - min)));
}

/**
 * Punto activo del profit. Va aparte porque el punto normal hereda el stroke de
 * la línea, que es el degradado, y saldría partido en verde y rojo él solo.
 */
function DotProfit({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: { profit?: number };
}) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      strokeWidth={2}
      stroke="#fff"
      fill={
        Number(payload?.profit ?? 0) < 0 ? SERIES.perdida : SERIES.ganancia
      }
    />
  );
}

/** Gráfico 2 - revenue, gasto y profit/pérdida (todos en USD, un solo eje). */
export function MoneyChart({ data }: { data: Point[] }) {
  // Los ids de SVG son globales del documento: si hubiera dos MoneyChart en la
  // misma página, url(#…) resolvería siempre al primero.
  const idDegradado = `omni-profit-${useId().replace(/\W/g, "")}`;
  const profits = data.map((d) => Number(d.profit ?? 0));
  const corte = corteEnCero(profits);
  // Línea plana: un solo color, según de qué lado del cero está.
  const strokeProfit =
    corte === null
      ? (profits[0] ?? 0) < 0
        ? SERIES.perdida
        : SERIES.ganancia
      : `url(#${idDegradado})`;

  const series = [
    {
      key: "revenue" as const,
      nombre: "Revenue",
      stroke: SERIES.revenue,
      dash: undefined as string | undefined,
      grosor: 2,
    },
    {
      key: "spend" as const,
      nombre: "Gasto",
      stroke: SERIES.spend,
      dash: undefined,
      grosor: 2,
    },
    {
      // Discontinua: además del color, el trazo lo distingue de las otras dos.
      key: "profit" as const,
      nombre: "Profit / Pérdida",
      stroke: strokeProfit,
      dash: "6 4",
      grosor: 2.5,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-3">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {s.key === "profit" ? (
              // Dos guiones: discontinua como en el gráfico, y partida porque
              // el profit es verde arriba del cero y rojo abajo.
              <span className="inline-flex items-center gap-0.5">
                <span
                  className="inline-block w-2 h-1.5 rounded-sm"
                  style={{ background: SERIES.ganancia }}
                />
                <span
                  className="inline-block w-2 h-1.5 rounded-sm"
                  style={{ background: SERIES.perdida }}
                />
              </span>
            ) : (
              <span
                className="inline-block w-3 h-1.5 rounded-sm"
                style={{ background: s.stroke }}
              />
            )}
            {s.nombre}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          {corte !== null && (
            <defs>
              <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor={SERIES.ganancia} />
                <stop offset={corte} stopColor={SERIES.ganancia} />
                <stop offset={corte} stopColor={SERIES.perdida} />
                <stop offset={1} stopColor={SERIES.perdida} />
              </linearGradient>
            </defs>
          )}
          <XAxis {...ejeX} />
          <YAxis
            tick={{ fill: INK.muted, fontSize: 11 }}
            stroke={INK.axis}
            width={64}
            tickFormatter={(v) => money(Number(v))}
          />
          <ReferenceLine y={0} stroke={INK.axis} strokeWidth={1} />
          <Tooltip
            content={<TooltipBox formato={money} porSigno={["profit"]} />}
            cursor={{ stroke: INK.axis, strokeDasharray: "3 3" }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.nombre}
              stroke={s.stroke}
              strokeWidth={s.grosor}
              strokeDasharray={s.dash}
              dot={false}
              activeDot={
                s.key === "profit" ? (
                  <DotProfit />
                ) : (
                  { r: 4, strokeWidth: 2, stroke: "#fff" }
                )
              }
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
