export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="/" className="flex items-baseline gap-1.5 select-none" aria-label="APEX F1 home">
      <span className="text-[17px] font-bold tracking-[0.08em] text-[var(--ink)]">
        APEX
      </span>
      <span className="bg-[var(--accent)] px-1 text-[13px] font-bold tracking-tight text-white">
        F1
      </span>
      {!compact && (
        <span className="ml-1 hidden text-[9px] uppercase tracking-[0.22em] text-[var(--ink-3)] lg:inline">
          Live Intel
        </span>
      )}
    </a>
  );
}
