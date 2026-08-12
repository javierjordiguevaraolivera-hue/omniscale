import { SkeletonHeader, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-md">
      <SkeletonHeader conControles={false} />
      <SkeletonTable columnas={4} filas={8} />
    </div>
  );
}
