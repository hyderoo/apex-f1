import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  body,
  className,
}: {
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div className={cn("panel panel-ticks flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      <div className="micro-label">No data</div>
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {body && <p className="max-w-md text-xs leading-relaxed text-[var(--ink-3)]">{body}</p>}
    </div>
  );
}

export function ErrorState({
  title = "Something failed to load",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="panel panel-ticks flex flex-col items-center justify-center gap-2 px-6 py-14 text-center" role="alert">
      <div className="micro-label text-[var(--accent)]">Error</div>
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="max-w-md text-xs leading-relaxed text-[var(--ink-3)]">{body}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 border border-[var(--line-2)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-3)]"
        >
          Retry
        </button>
      )}
    </div>
  );
}
