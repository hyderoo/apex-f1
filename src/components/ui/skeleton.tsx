import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function TimingTowerSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-px" aria-label="Loading timing data">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-2.5">
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <div className="ml-auto flex gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
