import { Info, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "@/app/actions";
import { PageHeader, Panel } from "@/components/panel";
import { ActionForm, SubmitButton } from "@/components/action-form";
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

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  const tz = data?.timezone ?? "America/New_York";
  const efId = data?.everflow_timezone_id ?? 67;
  const retention = data?.retention_days ?? 3;

  return (
    <div className="flex max-w-3xl flex-col gap-md">
      <PageHeader
        titulo="Ajustes"
        descripcion={`Hoy es ${todayInTz(tz)} según la zona configurada.`}
      />

      <Panel titulo="Configuración del reporte" icono={<SettingsIcon className="h-5 w-5" />}>
        <ActionForm accion={updateSettings} className="flex flex-col gap-md p-md">
          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              Zona horaria del reporte
            </span>
            <select name="timezone" defaultValue={tz} className={inputClass}>
              {ZONAS.map((z) => (
                <option key={z.tz} value={z.tz}>
                  {z.label} — {z.tz}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-label-sm text-on-surface-variant">
              Define dónde empieza y termina el &ldquo;día&rdquo; en todo el sistema.
            </span>
          </label>

          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              timezone_id de Everflow
            </span>
            <input
              name="everflow_timezone_id"
              type="number"
              defaultValue={efId}
              min={1}
              className={inputClass}
            />
            <span className="mt-1 block text-label-sm text-on-surface-variant">
              Everflow identifica las zonas por número, no por nombre. 67 = New
              York. Debe coincidir con la zona de arriba para que el corte de día
              cuadre.
            </span>
          </label>

          <label className="block">
            <span className="text-label-md text-on-surface-variant">
              Días de snapshots que se conservan
            </span>
            <input
              name="retention_days"
              type="number"
              defaultValue={retention}
              min={1}
              max={30}
              className={inputClass}
            />
            <span className="mt-1 block text-label-sm text-on-surface-variant">
              Las capturas por minuto se borran pasados estos días. El histórico
              consolidado (una fila por día y oferta) nunca se borra.
            </span>
          </label>

          <div>
            <SubmitButton className="h-11 rounded-lg bg-brand px-6 text-label-md text-white transition-opacity hover:opacity-90">
              Guardar ajustes
            </SubmitButton>
          </div>
        </ActionForm>
      </Panel>

      <Panel titulo="Cómo funciona la ingesta" icono={<Info className="h-5 w-5" />}>
        <ul className="flex list-disc flex-col gap-1 p-md pl-10 text-body-md text-on-surface-variant">
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
      </Panel>
    </div>
  );
}
