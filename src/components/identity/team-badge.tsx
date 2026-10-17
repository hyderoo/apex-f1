"use client";

import { useState } from "react";

/**
 * Renders a TheSportsDB team badge; on any load failure swaps to the
 * designed typographic mark passed as children. Never shows a broken image.
 */
export function TeamBadge({
  url, name, px, children,
}: {
  url: string; name: string; px: number; children: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{children}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN badge, next/image optimizer unnecessary
    <img
      src={url}
      alt={`${name} badge`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-[3px] object-contain"
      style={{ width: px, height: px }}
    />
  );
}
