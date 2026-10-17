import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "APEX F1 — Every Lap. Every Detail. Live.",
    template: "%s — APEX F1",
  },
  description:
    "A Formula 1 live intelligence dashboard for the 2026 season: timing, telemetry, strategy, weather and race control from real, attributable data sources.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "APEX F1",
    description: "Every Lap. Every Detail. Live.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 pb-20 md:pb-0">{children}</main>
            </div>
          </div>
          <MobileNav />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
