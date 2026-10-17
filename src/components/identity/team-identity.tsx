import { cn } from "@/lib/utils/cn";
import { hexToRgba } from "@/lib/utils/format";
import { teamMark } from "@/lib/assets/manifest";
import { teamBadge } from "@/lib/assets/team-badges";
import { TeamBadge } from "@/components/identity/team-badge";

function color(c: string | null | undefined) {
  return `#${(c ?? "8a8f98").replace("#", "")}`;
}

/**
 * Team identity: TheSportsDB badge artwork where a verified mapping exists
 * (src/lib/assets/team-badges.ts), otherwise the designed typographic mark
 * in the authentic team colour. Badges are used "as is" with attribution
 * (Teams page + README); the mark is the designed fallback on any failure.
 */
export function TeamIdentity({
  name, colour, size = "standard", className,
}: {
  name: string; colour?: string | null; size?: "compact" | "standard" | "featured"; className?: string;
}) {
  const c = color(colour);
  const px = size === "compact" ? 18 : size === "featured" ? 40 : 24;
  const mark = (
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
  );
  const badge = teamBadge(name);
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={name}>
      {badge ? <TeamBadge url={badge.url} name={name} px={px}>{mark}</TeamBadge> : mark}
      {size !== "compact" && <span className="truncate text-xs text-[var(--ink-2)]">{name}</span>}
    </span>
  );
}
