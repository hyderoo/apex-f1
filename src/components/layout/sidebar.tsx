"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAV_ITEMS } from "./nav";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./logo";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface-2)] transition-[width] duration-200 md:flex",
        collapsed ? "w-14" : "w-52",
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-[var(--line)]", collapsed ? "justify-center" : "px-4")}>
        <Logo compact={collapsed} />
      </div>
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-2 text-[13px] transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "text-[var(--ink)] font-medium"
                  : "text-[var(--ink-3)] hover:text-[var(--ink-2)]",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 bg-[var(--accent)]" />
              )}
              <Icon size={16} strokeWidth={1.75} className={active ? "text-[var(--accent)]" : ""} />
              {!collapsed && <span className="tracking-wide">{label}</span>}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex h-10 items-center justify-center border-t border-[var(--line)] text-[var(--ink-3)] hover:text-[var(--ink)]"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
      </button>
    </aside>
  );
}
