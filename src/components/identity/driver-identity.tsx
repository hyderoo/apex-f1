"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { hexToRgba } from "@/lib/utils/format";

function color(c: string | null | undefined) {
  return `#${(c ?? "8a8f98").replace("#", "")}`;
}

/** Portrait with designed monogram fallback. Never a broken image icon. */
export function DriverAvatar({
  src, acronym, teamColour, size = 28, className,
}: {
  src?: string | null; acronym: string; teamColour?: string | null; size?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const c = color(teamColour);
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn("flex shrink-0 items-center justify-center rounded-[3px] font-mono font-bold", className)}
        style={{
          width: size, height: size, fontSize: Math.max(9, size * 0.36),
          background: hexToRgba(c, 0.16), color: c, border: `1px solid ${hexToRgba(c, 0.5)}`,
        }}
      >
        {acronym.slice(0, 2)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote F1 CDN, small fixed avatars; next/image adds no value at this size
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-[3px] object-cover object-top", className)}
      style={{ width: size, height: size, background: hexToRgba(c, 0.12) }}
    />
  );
}

export function DriverIdentity({
  number, acronym, fullName, teamName, teamColour, headshotUrl, size = "standard", href, className,
}: {
  number: number; acronym: string; fullName?: string; teamName?: string;
  teamColour?: string | null; headshotUrl?: string | null;
  size?: "compact" | "standard" | "featured"; href?: string | null; className?: string;
}) {
  const px = size === "compact" ? 24 : size === "featured" ? 96 : 32;
  const inner = (
    <span className={cn("inline-flex items-center gap-2", className)} title={fullName ? `${fullName}${teamName ? ` — ${teamName}` : ""}` : acronym}>
      <DriverAvatar src={headshotUrl} acronym={acronym} teamColour={teamColour} size={px} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-mono font-semibold" style={{ color: color(teamColour), fontSize: size === "featured" ? 15 : 13 }}>
          {acronym}
        </span>
        {size !== "compact" && teamName && (
          <span className="truncate text-[10px] text-[var(--ink-3)]">{teamName}</span>
        )}
      </span>
      {size === "featured" && fullName && (
        <span className="sr-only">{fullName}</span>
      )}
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
