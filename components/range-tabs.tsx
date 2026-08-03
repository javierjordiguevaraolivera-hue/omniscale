import Link from "next/link";

const RANGOS = [
  { days: 3, label: "3 días" },
  { days: 7, label: "7 días" },
  { days: 15, label: "15 días" },
  { days: 30, label: "30 días" },
];

export function RangeTabs({ days, offer }: { days: number; offer: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-1">
      {RANGOS.map((r) => {
        const activo = r.days === days;
        return (
          <Link
            key={r.days}
            href={`/history?days=${r.days}&offer=${offer}`}
            className={`rounded-md px-3 py-1 text-label-md transition-colors ${
              activo
                ? "bg-brand text-white"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-brand"
            }`}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
