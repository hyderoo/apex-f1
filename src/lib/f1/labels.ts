import type { SessionStatus } from "@/lib/domain/types";

export function sessionStatusLabel(s: SessionStatus): string {
  switch (s) {
    case "live": return "Live";
    case "upcoming": return "Upcoming";
    case "finished": return "Finished";
    case "cancelled": return "Cancelled";
    default: return "Unknown";
  }
}
