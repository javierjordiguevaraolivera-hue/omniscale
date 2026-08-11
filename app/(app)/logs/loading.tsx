import { SkeletonHeader, SkeletonTable } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-md">
      <SkeletonHeader />
      <SkeletonTable columnas={6} filas={14} />
    </div>
  );
}
