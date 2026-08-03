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
    <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
      Oferta
      <select
        className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-brand/20"
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
