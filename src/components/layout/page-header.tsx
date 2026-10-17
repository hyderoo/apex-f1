import type { DataStatus } from "@/lib/domain/types";
import { DataStatusBadge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
  updatedAt,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  status?: DataStatus;
  updatedAt?: string | null;
}) {
  return (
    <div className="border-b border-[var(--line)] px-4 py-5 md:px-6">
      <div className="micro-label">{eyebrow}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {status && <DataStatusBadge status={status} />}
        {updatedAt && (
          <span className="text-[11px] text-[var(--ink-3)]">
            Updated {new Date(updatedAt).toLocaleTimeString("en-GB")}
          </span>
        )}
      </div>
      {description && <p className="mt-1 max-w-2xl text-sm text-[var(--ink-2)]">{description}</p>}
    </div>
  );
}
