import {
  Calendar, Flag, Gauge, LayoutDashboard, Search, Trophy, Users, Wrench, LineChart, Star, CircleDot, Activity, HeartPulse, Radio,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Timing", icon: Activity },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/teams", label: "Teams", icon: Wrench },
  { href: "/circuits", label: "Circuits", icon: CircleDot },
  { href: "/telemetry", label: "Telemetry", icon: Gauge },
  { href: "/radio", label: "Team Radio", icon: Radio },
  { href: "/strategy", label: "Strategy", icon: Flag },
  { href: "/analysis", label: "Race Analysis", icon: LineChart },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/health", label: "Data Health", icon: HeartPulse },
] as const;

export { Search };
