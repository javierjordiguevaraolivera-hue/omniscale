import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayInTz } from "@/lib/tz";
import { money, num, sourceLabel } from "@/lib/format";
import { StatTile } from "@/components/stat-tile";
import { RunNowButton } from "@/components/run-now-button";
import { OfferSelect } from "@/components/offer-select";
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
type AccountRow = {
  account_id: string;
  account_name: string;
  offer_id: number | null;
  spend: number;
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

  const [seriesRes, osRes, accRes, offersRes] = await Promise.all([
    supabase.rpc("intraday_series", { p_day: day, p_offer: offerFilter }),
    supabase.rpc("latest_offer_source", { p_day: day }),
    supabase.rpc("latest_accounts", { p_day: day }),
    supabase.from("offers").select("offer_id,name").order("offer_id"),
  ]);

  const series = (seriesRes.data ?? []) as SeriesRow[];
  const offers = (offersRes.data ?? []) as Offer[];
  let offerSource = (osRes.data ?? []) as OfferSourceRow[];
  let accounts = (accRes.data ?? []) as AccountRow[];
  if (offerFilter !== null) {
    offerSource = offerSource.filter((r) => r.offer_id === offerFilter);
    accounts = accounts.filter((r) => r.offer_id === offerFilter);
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
  const sinAsignar = accounts.filter((a) => a.offer_id === null && a.spend > 0);

  const nombreOferta = (id: number | null) =>
    id === null
      ? "Sin asignar"
      : offers.find((o) => o.offer_id === id)?.name || `Oferta ${id}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Hoy · {day}</h1>
          <p className="text-sm text-muted-foreground">
            Zona horaria {tz}
            {ultimo
              ? ` · última captura ${puntos.at(-1)!.hora}`
              : " · sin capturas todavía"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OfferSelect offers={offers} value={offer ?? "all"} basePath="/dashboard" />
          <RunNowButton />
        </div>
      </div>

      {puntos.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm">
          <p className="font-medium">Todavía no hay capturas de hoy.</p>
          <p className="text-muted-foreground mt-1">
            Registra tu API key de Everflow y los tokens de Facebook en{" "}
            <Link href="/connections" className="underline">
              Conexiones
            </Link>
            , y usa &ldquo;Actualizar ahora&rdquo; para la primera corrida.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatTile label="Gasto" value={money(spend)} />
        <StatTile label="Conversiones" value={num(conversions)} />
        <StatTile label="Revenue" value={money(revenue)} />
        <StatTile
          label="Profit / Pérdida"
          value={money(profit)}
          tone={profit > 0 ? "good" : profit < 0 ? "bad" : "neutral"}
        />
        <StatTile
          label="Costo por conversión"
          value={money(cpa)}
          hint={`ROAS ${roas.toFixed(2)}x`}
        />
      </div>

      {sinAsignar.length > 0 && (
        <div className="rounded-2xl border border-[#ec835a] bg-[#fff7f3] p-4 text-sm">
          <p className="font-medium">
            {sinAsignar.length} cuenta(s) con gasto y sin oferta asignada
          </p>
          <p className="text-muted-foreground mt-1">
            Su gasto no se atribuye a ninguna oferta. Asígnalas en la tabla de
            cuentas de abajo, o agrega <code>oid_&lt;ID&gt;</code> al nombre de la
            cuenta en Facebook para que se mapee sola.
          </p>
        </div>
      )}

      {/* Gráfico 1 */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Evolución operativa</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Gasto, conversiones y costo por conversión a lo largo del día.
        </p>
        <OperationChart data={puntos} />
      </section>

      {/* Gráfico 2 */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Revenue, gasto y profit</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Las tres variables en dólares sobre el mismo eje.
        </p>
        <MoneyChart data={puntos} />
      </section>

      {/* Tabla oferta x plataforma */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-4">Por oferta y plataforma</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Oferta</th>
                <th className="py-2 pr-4 font-medium">Plataforma</th>
                <th className="py-2 pr-4 font-medium text-right">Clicks</th>
                <th className="py-2 pr-4 font-medium text-right">Conversiones</th>
                <th className="py-2 font-medium text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {offerSource.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    Sin conversiones registradas hoy.
                  </td>
                </tr>
              )}
              {offerSource.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    {r.offer_name || `Oferta ${r.offer_id}`}
                    <span className="text-muted-foreground"> · {r.offer_id}</span>
                  </td>
                  <td className="py-2 pr-4">{sourceLabel(r.source_id)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {num(Number(r.clicks))}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {num(Number(r.conversions))}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {money(Number(r.revenue))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla cuentas publicitarias */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Cuentas publicitarias de hoy</h2>
        <p className="text-xs text-muted-foreground mb-4">
          La oferta se detecta del nombre (<code>oid_3560</code>). Si la cambias, la
          data ya guardada no se altera: solo aplica a las capturas siguientes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4 font-medium">Cuenta</th>
                <th className="py-2 pr-4 font-medium text-right">Gasto</th>
                <th className="py-2 font-medium">Oferta asignada</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-muted-foreground">
                    Sin cuentas capturadas hoy.
                  </td>
                </tr>
              )}
              {accounts.map((a) => (
                <tr key={a.account_id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    {a.account_name || a.account_id}
                    <span className="block text-xs text-muted-foreground">
                      {a.account_id}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {money(Number(a.spend))}
                  </td>
                  <td className="py-2">
                    {a.offer_id === null ? (
                      <span className="text-[#d03b3b] font-medium">
                        ⚠ Sin configurar
                      </span>
                    ) : (
                      nombreOferta(a.offer_id)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Para asignar o corregir la oferta de una cuenta, ve a{" "}
          <Link href="/accounts" className="underline">
            Cuentas
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
