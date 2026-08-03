import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";

const ZONAS = [
  { tz: "America/New_York", label: "New York (ET)" },
  { tz: "America/Chicago", label: "Chicago (CT)" },
  { tz: "America/Denver", label: "Denver (MT)" },
  { tz: "America/Los_Angeles", label: "Los Ángeles (PT)" },
  { tz: "America/Lima", label: "Lima (PET)" },
  { tz: "America/Bogota", label: "Bogotá (COT)" },
  { tz: "America/Mexico_City", label: "Ciudad de México" },
  { tz: "UTC", label: "UTC" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  const tz = data?.timezone ?? "America/New_York";
  const efId = data?.everflow_timezone_id ?? 67;
  const retention = data?.retention_days ?? 3;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hoy es <strong>{todayInTz(tz)}</strong> según la zona configurada.
        </p>
      </div>

      <form
        action={updateSettings}
        className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-5"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="timezone">Zona horaria del reporte</Label>
          <select
            id="timezone"
            name="timezone"
            defaultValue={tz}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          >
            {ZONAS.map((z) => (
              <option key={z.tz} value={z.tz}>
                {z.label} — {z.tz}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Define dónde empieza y termina el &ldquo;día&rdquo; en todo el sistema.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="everflow_timezone_id">timezone_id de Everflow</Label>
          <Input
            id="everflow_timezone_id"
            name="everflow_timezone_id"
            type="number"
            defaultValue={efId}
            min={1}
          />
          <p className="text-xs text-muted-foreground">
            Everflow identifica las zonas por número, no por nombre. 67 = New York.
            Debe coincidir con la zona de arriba para que el corte de día cuadre.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="retention_days">Días de snapshots que se conservan</Label>
          <Input
            id="retention_days"
            name="retention_days"
            type="number"
            defaultValue={retention}
            min={1}
            max={30}
          />
          <p className="text-xs text-muted-foreground">
            Las capturas por minuto se borran pasados estos días. El histórico
            consolidado (una fila por día y oferta) nunca se borra.
          </p>
        </div>

        <div>
          <Button type="submit">Guardar ajustes</Button>
        </div>
      </form>

      <section className="rounded-2xl border border-border bg-card p-5 text-sm">
        <h2 className="font-semibold mb-2">Cómo funciona la ingesta</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1 text-muted-foreground">
          <li>Un cron en Vercel corre cada minuto y guarda una captura del día.</li>
          <li>
            Cada captura graba la oferta que tenía la cuenta publicitaria en ese
            instante, así el histórico no cambia si mañana reasignas la cuenta.
          </li>
          <li>
            Al cambiar el día, el anterior se consolida en una sola fila por oferta
            (gasto, conversiones, revenue, profit).
          </li>
        </ul>
      </section>
    </div>
  );
}
