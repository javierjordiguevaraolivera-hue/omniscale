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
      <SkeletonChart barras={30} />
      <SkeletonChart barras={30} />
      <SkeletonTable columnas={7} filas={4} />
      <SkeletonTable columnas={5} filas={5} />
    </div>
  );
}
