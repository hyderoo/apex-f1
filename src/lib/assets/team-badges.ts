/**
 * Team badge artwork, hotlinked from TheSportsDB (thesportsdb.com), used
 * "as is" per their terms of use with attribution on the Teams page and in
 * the README. Logos remain the teams' trademarks; identification use in a
 * non-commercial portfolio. Mapped 2026-10-18 against TheSportsDB's
 * Formula 1 league listing — each entry verified to be the CURRENT team
 * (not a defunct variant) and its badge URL confirmed 200 image/png.
 * If a team is missing or an image fails, TeamIdentity falls back to the
 * designed typographic mark.
 */
export const TEAM_BADGES: Record<string, { url: string; sourceName: string }> = {
  "Alpine":          { url: "https://r2.thesportsdb.com/images/media/team/badge/ozhoj31740774899.png", sourceName: "BWT Alpine Formula One Team" },
  "Aston Martin":    { url: "https://r2.thesportsdb.com/images/media/team/badge/ez5rlk1740774066.png", sourceName: "Aston Martin Aramco Formula One Team" },
  "Audi":            { url: "https://r2.thesportsdb.com/images/media/team/badge/3uce6h1773158180.png", sourceName: "Audi Revolut F1 Team" },
  "Cadillac":        { url: "https://r2.thesportsdb.com/images/media/team/badge/2wqnjo1769429652.png", sourceName: "Cadillac Formula 1 Team" },
  "Ferrari":         { url: "https://r2.thesportsdb.com/images/media/team/badge/rxwsqv1420417429.png", sourceName: "Scuderia Ferrari HP" },
  "Haas F1 Team":    { url: "https://r2.thesportsdb.com/images/media/team/badge/9yp3s51740773680.png", sourceName: "MoneyGram Haas F1 Team" },
  "McLaren":         { url: "https://r2.thesportsdb.com/images/media/team/badge/kzqi7v1743602056.png", sourceName: "McLaren Formula 1 Team" },
  "Mercedes":        { url: "https://r2.thesportsdb.com/images/media/team/badge/6caw0r1744037679.png", sourceName: "Mercedes-AMG PETRONAS Formula One Team" },
  "Racing Bulls":    { url: "https://r2.thesportsdb.com/images/media/team/badge/ot7pjx1740775883.png", sourceName: "Visa Cash App Racing Bulls Formula One Team" },
  "Red Bull Racing": { url: "https://r2.thesportsdb.com/images/media/team/badge/nhlev81679826274.png", sourceName: "Oracle Red Bull Racing" },
  "Williams":        { url: "https://r2.thesportsdb.com/images/media/team/badge/fp1cil1740776050.png", sourceName: "Williams Racing" },
};

/**
 * Jolpica constructor names differ from OpenF1 team names (e.g. "Red Bull",
 * "RB F1 Team", "Alpine F1 Team", "Cadillac F1 Team"). Map every known
 * variant to the canonical OpenF1 key above. Verified against the live
 * Jolpica 2026 constructor standings on 2026-10-18.
 */
const TEAM_NAME_ALIASES: Record<string, string> = {
  "red bull": "Red Bull Racing",
  "rb f1 team": "Racing Bulls",
  "rb": "Racing Bulls",
  "visa cash app rb": "Racing Bulls",
  "alpine f1 team": "Alpine",
  "cadillac f1 team": "Cadillac",
  "haas": "Haas F1 Team",
  "sauber": "Audi",
  "kick sauber": "Audi",
  "stake f1 team": "Audi",
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function teamBadge(teamName: string) {
  const exact = TEAM_BADGES[teamName];
  if (exact) return exact;
  const alias = TEAM_NAME_ALIASES[normalize(teamName)];
  return alias ? TEAM_BADGES[alias] ?? null : null;
}
