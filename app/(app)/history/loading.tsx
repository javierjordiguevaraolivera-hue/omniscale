import {
  SkeletonChart,
  SkeletonHeader,
  SkeletonTable,
  SkeletonTiles,
} from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-md">
      <SkeletonHeader />
      <SkeletonTiles cuantas={6} />
      <SkeletonChart barras={14} />
      <SkeletonTable columnas={6} filas={8} />
    </div>
  );
}
