import Link from "next/link";

const RANGOS = [
  { days: 3, label: "3 días" },
  { days: 7, label: "7 días" },
  { days: 15, label: "15 días" },
  { days: 30, label: "30 días" },
];

export function RangeTabs({ days, offer }: { days: number; offer: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
      {RANGOS.map((r) => {
        const activo = r.days === days;
        return (
          <Link
            key={r.days}
            href={`/history?days=${r.days}&offer=${offer}`}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              activo
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
