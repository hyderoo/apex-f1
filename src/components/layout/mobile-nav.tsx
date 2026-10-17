"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/cn";

export function MobileNav() {
  const pathname = usePathname();
  const primary = NAV_ITEMS.slice(0, 5);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[var(--line)] bg-[var(--surface-2)]/95 backdrop-blur md:hidden"
      aria-label="Primary mobile"
    >
      {primary.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[9px] uppercase tracking-wider",
              active ? "text-[var(--accent)]" : "text-[var(--ink-3)]",
            )}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
