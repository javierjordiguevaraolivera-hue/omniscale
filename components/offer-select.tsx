"use client";

import { useRouter } from "next/navigation";

export function OfferSelect({
  offers,
  value,
  basePath,
  extraParams,
}: {
  offers: { offer_id: number; name: string }[];
  value: string;
  basePath: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Oferta
      <select
        className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams({
            ...(extraParams ?? {}),
            offer: e.target.value,
          });
          router.push(`${basePath}?${params.toString()}`);
        }}
      >
        <option value="all">Todas</option>
        {offers.map((o) => (
          <option key={o.offer_id} value={String(o.offer_id)}>
            {o.name || `Oferta ${o.offer_id}`} · {o.offer_id}
          </option>
        ))}
      </select>
    </label>
  );
}
