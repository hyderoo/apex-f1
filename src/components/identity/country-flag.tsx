"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { countryName, flagCdnUrl } from "@/lib/assets/manifest";

/** Host-country flag (flagcdn, terms verified) with code-badge fallback. */
export function CountryFlag({
  alpha3, size = 20, className, showName = false,
}: {
  alpha3: string | null | undefined; size?: number; className?: string; showName?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = flagCdnUrl(alpha3, size > 20 ? 80 : 40);
  const label = countryName(alpha3) ?? "Unknown country";
  if (!src || failed) {
    return (
      <span
        role="img" aria-label={label} title={label}
        className={cn("inline-flex items-center justify-center rounded-[2px] border border-[var(--line)] bg-[var(--surface-3)] font-mono text-[9px] text-[var(--ink-3)]", className)}
        style={{ width: size * 1.4, height: size }}
      >
        {alpha3?.slice(0, 2) ?? "?"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size flag */}
      <img
        src={src}
        alt={label}
        title={label}
        width={Math.round(size * 1.4)}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="rounded-[2px] border border-[var(--line)]"
        style={{ width: size * 1.4, height: size }}
      />
      {showName && <span className="text-xs text-[var(--ink-2)]">{label}</span>}
    </span>
  );
}

/** Flag from a provider-supplied URL (e.g. OpenF1 meeting country_flag). */
export function FlagImage({
  src, label, size = 20, className,
}: {
  src?: string | null; label: string; size?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        role="img" aria-label={label} title={label}
        className={cn("inline-block rounded-[2px] border border-[var(--line)] bg-[var(--surface-3)]", className)}
        style={{ width: size * 1.4, height: size }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small fixed-size flag
    <img
      src={src}
      alt={label}
      title={label}
      width={Math.round(size * 1.4)}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-[2px] border border-[var(--line)]", className)}
      style={{ width: size * 1.4, height: size }}
    />
  );
}
