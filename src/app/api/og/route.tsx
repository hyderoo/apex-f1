import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { fetchDriverStandings } from "@/lib/providers/jolpica";
import { getCurrentDrivers } from "@/lib/f1/drivers";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

const base: React.CSSProperties = {
  width: W,
  height: H,
  display: "flex",
  flexDirection: "column",
  background: "#0b0c0f",
  color: "#e8e9ec",
  fontFamily: "sans-serif",
  padding: 56,
};

function Header({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#e10600", color: "#fff", fontWeight: 800, fontSize: 28, padding: "4px 10px" }}>F1</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>APEX F1</div>
      </div>
      <div style={{ fontSize: 18, color: "#9aa0a8", letterSpacing: 3, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function DriverBlock({ name, code, number, points, position, colour }: {
  name: string; code: string; number: string; points: string; position: string; colour: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, border: "1px solid #26292f", padding: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ fontSize: 64, fontWeight: 800 }}>{number}</span>
        <span style={{ fontSize: 26, color: "#9aa0a8" }}>{code}</span>
        <span style={{ width: 34, height: 6, background: `#${colour}`, marginLeft: "auto" }} />
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, marginTop: 8 }}>{name}</div>
      <div style={{ display: "flex", gap: 24, marginTop: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 44, fontWeight: 800 }}>{points}</span>
          <span style={{ fontSize: 14, color: "#9aa0a8", letterSpacing: 2 }}>POINTS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 44, fontWeight: 800 }}>P{position}</span>
          <span style={{ fontSize: 14, color: "#9aa0a8", letterSpacing: 2 }}>CHAMPIONSHIP</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Share cards (OpenGraph images). All figures come from the same live
 * providers as the app; on any failure we render the brand card.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "brand";
  const season = 2026;

  if (type === "h2h") {
    const a = (req.nextUrl.searchParams.get("a") ?? "").toUpperCase();
    const b = (req.nextUrl.searchParams.get("b") ?? "").toUpperCase();
    try {
      const [standings, current] = await Promise.all([
        fetchDriverStandings(season),
        getCurrentDrivers().catch(() => ({ drivers: [] })),
      ]);
      const rows = standings.data;
      // Team colours come from OpenF1 driver metadata, keyed by family name.
      const colourByName = new Map(
        current.drivers.map((d) => [d.fullName.split(" ").pop()!.toUpperCase(), d.teamColour]),
      );
      const find = (code: string) =>
        rows.find((r) => r.code?.toUpperCase() === code || r.driverId.toUpperCase() === code.toLowerCase().replace(/ /g, "_") || r.familyName.toUpperCase() === code);
      const ra = find(a);
      const rb = find(b);
      if (ra && rb) {
        const block = (r: (typeof rows)[number]) => (
          <DriverBlock
            key={r.driverId}
            name={`${r.givenName} ${r.familyName}`}
            code={r.code ?? r.familyName.slice(0, 3).toUpperCase()}
            number={r.permanentNumber !== null ? String(r.permanentNumber) : "—"}
            points={String(r.points)}
            position={String(r.position)}
            colour={colourByName.get(r.familyName.toUpperCase()) ?? "e10600"}
          />
        );
        return new ImageResponse(
          (
            <div style={base}>
              <Header label={`${season} driver comparison`} />
              <div style={{ display: "flex", gap: 24, marginTop: 40, flex: 1 }}>
                {block(ra)}
                <div style={{ display: "flex", alignItems: "center", fontSize: 30, color: "#9aa0a8", fontWeight: 700 }}>VS</div>
                {block(rb)}
              </div>
              <div style={{ marginTop: 28, fontSize: 16, color: "#6b7078" }}>
                Championship standings after the latest recorded round · apex-f1
              </div>
            </div>
          ),
          { width: W, height: H },
        );
      }
    } catch {
      // fall through to brand card
    }
  }

  // Brand card (default + fallback)
  return new ImageResponse(
    (
      <div style={base}>
        <Header label="Live intelligence" />
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>Every Lap. Every Detail. Live.</div>
          <div style={{ fontSize: 24, color: "#9aa0a8", marginTop: 20 }}>
            Timing, telemetry, strategy and race control from real, attributable data.
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
