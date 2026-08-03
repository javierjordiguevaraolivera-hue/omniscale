/** Tarjeta de métrica del panel (estilo EcomfyCalls v2: borde, hover, icono). */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icono,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "bad";
  /** Elemento ya creado: icono={<Wallet className="h-4 w-4" />} */
  icono?: React.ReactNode;
}) {
  const colorValor =
    tone === "good" ? "text-success" : tone === "bad" ? "text-error" : "text-brand";
  const colorIcono =
    tone === "good" ? "text-success" : tone === "bad" ? "text-error" : "text-brand-steel";

  return (
    <div className="min-h-[104px] rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm transition-colors hover:border-brand-crimson">
      <div
        className={`mb-1 flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-4 ${colorIcono}`}
      >
        {icono}
        <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
      </div>
      <h3 className={`text-headline-md tabular-nums ${colorValor}`}>{value}</h3>
      {hint && <p className="text-label-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
