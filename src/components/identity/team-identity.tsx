import { cn } from "@/lib/utils/cn";
import { hexToRgba } from "@/lib/utils/format";
import { teamMark } from "@/lib/assets/manifest";

function color(c: string | null | undefined) {
  return `#${(c ?? "8a8f98").replace("#", "")}`;
}

/**
 * Team identity with a designed typographic mark in the authentic team colour.
 * A real logo is intentionally not used: no licensed programmatic source
 * exists (see src/lib/assets/manifest.ts).
 */
export function TeamIdentity({
  name, colour, size = "standard", className,
}: {
  name: string; colour?: string | null; size?: "compact" | "standard" | "featured"; className?: string;
}) {
  const c = color(colour);
  const px = size === "compact" ? 18 : size === "featured" ? 40 : 24;
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={name}>
      <span
        aria-hidden
        className="flex shrink-0 items-center justify-center rounded-[3px] font-mono font-bold"
        style={{
          width: px, height: px, fontSize: Math.max(8, px * 0.34),
          background: hexToRgba(c, 0.16), color: c, border: `1px solid ${hexToRgba(c, 0.5)}`,
        }}
      >
        {teamMark(name)}
      </span>
      {size !== "compact" && <span className="truncate text-xs text-[var(--ink-2)]">{name}</span>}
    </span>
  );
}
