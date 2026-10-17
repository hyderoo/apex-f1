import Link from "next/link";
import { FlagImage } from "./country-flag";

/**
 * Compact featured-event band. Circuit imagery comes from the provider
 * (OpenF1 meeting.circuit_image) — never a guessed or stock photo.
 */
export function CircuitHero({
  name, circuitShortName, location, countryName, countryFlagUrl, circuitImageUrl,
  eyebrow, href, cta, children,
}: {
  name: string; circuitShortName: string; location: string; countryName: string;
  countryFlagUrl?: string | null; circuitImageUrl?: string | null;
  eyebrow?: string; href?: string; cta?: string; children?: React.ReactNode;
}) {
  const body = (
    <div className="relative overflow-hidden border-b border-[var(--line)]">
      {circuitImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- decorative provider image with overlay
        <img
          src={circuitImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/85 to-transparent" />
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 md:px-6">
        <FlagImage src={countryFlagUrl} label={countryName} size={22} />
        <div className="min-w-0">
          {eyebrow && <div className="micro-label">{eyebrow}</div>}
          <div className="text-lg font-bold tracking-tight md:text-xl">{name}</div>
          <div className="text-xs text-[var(--ink-3)]">
            {circuitShortName} · {location}, {countryName}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">{children}</div>
        {cta && (
          <span className="border border-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]">
            {cta}
          </span>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} className="group block">{body}</Link> : body;
}
