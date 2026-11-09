import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-5 p-2 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-line/80 mb-4" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

