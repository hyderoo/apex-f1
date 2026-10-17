import { cn } from "@/lib/utils/cn";
import type { DataStatus } from "@/lib/domain/types";

const statusStyles: Record<DataStatus, string> = {
  live: "bg-[var(--live)] text-white",
  delayed: "bg-[var(--warn)]/15 text-[var(--warn)] border border-[var(--warn)]/40",
  historical: "bg-[var(--surface-3)] text-[var(--ink-2)] border border-[var(--line-2)]",
  demo: "bg-[var(--pb)]/15 text-[var(--pb)] border border-[var(--pb)]/40",
  unavailable: "bg-transparent text-[var(--ink-3)] border border-dashed border-[var(--line-2)]",
};

const statusLabels: Record<DataStatus, string> = {
  live: "LIVE",
  delayed: "DELAYED",
  historical: "HISTORICAL",
  demo: "DEMO DATA",
  unavailable: "UNAVAILABLE",
};

export function DataStatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.12em]",
        statusStyles[status],
        className,
      )}
    >
      {status === "live" && (
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-white" />
      )}
      {statusLabels[status]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "ok" | "warn" | "pb";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--surface-3)] text-[var(--ink-2)] border border-[var(--line)]",
    accent: "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30",
    ok: "bg-[var(--ok)]/10 text-[var(--ok)] border border-[var(--ok)]/30",
    warn: "bg-[var(--warn)]/10 text-[var(--warn)] border border-[var(--warn)]/30",
    pb: "bg-[var(--pb)]/10 text-[var(--pb)] border border-[var(--pb)]/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase", tones[tone], className)}>
      {children}
    </span>
  );
}
