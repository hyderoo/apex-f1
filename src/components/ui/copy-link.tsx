"use client";

import { useState } from "react";

/** Copies the current URL (including query params) for sharing. */
export function CopyLinkButton({ label = "Copy link" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1 text-[11px] uppercase tracking-wider hover:text-[var(--accent)]"
      title="Copy a link to this exact view (selections are in the URL)"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
