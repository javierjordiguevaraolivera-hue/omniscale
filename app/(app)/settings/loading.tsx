import { Bloque, SkeletonHeader, SkeletonPanel } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex max-w-3xl flex-col gap-md">
      <SkeletonHeader conControles={false} />
      <SkeletonPanel>
        <div className="flex flex-col gap-md">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bloque className="h-3 w-48" />
              <Bloque className="h-11 w-full" />
              <Bloque className="h-3 w-2/3" />
            </div>
          ))}
          <Bloque className="h-11 w-40" />
        </div>
      </SkeletonPanel>
      <SkeletonPanel alto="h-32" />
    </div>
  );
}
