"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Horizontally scrollable region with mouse drag-to-scroll and edge fades
 * that show when more columns exist off-screen. Touch keeps native scrolling;
 * drag only engages for mouse pointers and never before a 4px threshold, so
 * clicks, text selection and links keep working. A click that ends a drag is
 * swallowed so row links/buttons don't fire accidentally.
 */
export function DragScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; sl: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setScrollable(el.scrollWidth > el.clientWidth + 4);
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "overflow-x-auto",
          scrollable && !dragging && "cursor-grab",
          dragging && "cursor-grabbing select-none",
          className,
        )}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0) return;
          const el = ref.current;
          if (!el || el.scrollWidth <= el.clientWidth) return;
          drag.current = { x: e.clientX, sl: el.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const el = ref.current;
          if (!d || !el) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 4) {
            d.moved = true;
            setDragging(true);
            try { el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
          }
          if (d.moved) {
            el.scrollLeft = d.sl - dx;
            e.preventDefault();
          }
        }}
        onPointerUp={() => {
          if (drag.current?.moved) suppressClick.current = true;
          drag.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
      {edges.left && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--surface-2)] to-transparent" />
      )}
      {edges.right && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--surface-2)] to-transparent" />
      )}
    </div>
  );
}
