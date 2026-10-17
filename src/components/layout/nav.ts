import {
  Calendar, Flag, Gauge, LayoutDashboard, Search, Trophy, Users, Wrench, LineChart, Star, CircleDot, Activity,
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
  { href: "/strategy", label: "Strategy", icon: Flag },
  { href: "/analysis", label: "Race Analysis", icon: LineChart },
  { href: "/favorites", label: "Favorites", icon: Star },
] as const;

export { Search };
