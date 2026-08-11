import { Bloque, SkeletonHeader, SkeletonPanel } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-md">
      <SkeletonHeader />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonPanel key={i}>
          <Bloque className="h-4 w-3/4" />
          <div className="mt-md grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <Bloque className="h-10" />
            <Bloque className="h-10" />
            <Bloque className="h-10 w-28" />
          </div>
        </SkeletonPanel>
      ))}
    </div>
  );
}
