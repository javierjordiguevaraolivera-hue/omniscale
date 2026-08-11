import { SkeletonHeader, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-md">
      <SkeletonHeader conControles={false} />
      <SkeletonTable columnas={6} filas={6} />
      <SkeletonTable columnas={6} filas={4} />
    </div>
  );
}
