"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

const GLOSSARY: Record<string, string> = {
  DRS: "Drag Reduction System — movable rear wing flap that reduces drag in designated zones.",
  Stint: "A run of consecutive laps on the same set of tyres.",
  "Gap to leader": "Time difference to the race leader. LAP(S) means the driver has been lapped.",
  Interval: "Time difference to the car immediately ahead.",
  Compound: "Tyre type: SOFT (fast, wears quickly), MEDIUM, HARD (slow, durable), INTERMEDIATE or WET for rain.",
  "Speed trap": "Highest speed recorded at the finish-line speed trap on that lap.",
  "Tyre age": "Number of laps completed on the current set of tyres.",
  PB: "Personal best — the driver's own fastest time in this session.",
  "Session best": "Fastest time set by any driver in this session.",
};

export function Term({ children }: { children: string }) {
  const def = GLOSSARY[children];
  if (!def) return <>{children}</>;
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className="cursor-help underline decoration-dotted decoration-[var(--ink-3)] underline-offset-2">
            {children}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-[90] max-w-64 border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--ink-2)] shadow-lg"
          >
            {def}
            <Tooltip.Arrow className="fill-[var(--line-2)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
