/**
 * Asset manifest — image sourcing rules for APEX F1.
 *
 * Sources and terms (verified 2026-10-17):
 * - Driver portraits, circuit images, GP flags: URLs come from OpenF1 API
 *   responses (media.formula1.com). Never constructed or guessed; taken from
 *   provider data only. F1 does not publish an explicit reuse license, so we
 *   hotlink (no re-hosting) and keep designed monogram fallbacks everywhere.
 * - Driver nationality flags: flagcdn.com — free embedding service, terms
 *   verified at https://flagcdn.com ("free to embed on your website"),
 *   credit to flagpedia.net is noted in README and the settings page.
 * - Team badges: TheSportsDB (thesportsdb.com), hotlinked "as is" per their
 *   terms with attribution (Teams page + README); mapping verified against
 *   their Formula 1 league listing in src/lib/assets/team-badges.ts.
 *   The designed typographic mark (TeamIdentity) remains the fallback.
 */

/** ISO 3166-1 alpha-3 (OpenF1 country_code) to alpha-2 (flagcdn) for F1 nationalities. */
const A3_TO_A2: Record<string, string> = {
  NED: "nl", GBR: "gb", MON: "mc", GER: "de", ESP: "es", AUS: "au",
  CAN: "ca", FRA: "fr", ITA: "it", JPN: "jp", MEX: "mx", BRA: "br",
  THA: "th", CHN: "cn", USA: "us", FIN: "fi", DEN: "dk", NZL: "nz",
  ARG: "ar", BEL: "be", AUT: "at", SUI: "ch", SWE: "se", POL: "pl",
};

export function flagCdnUrl(alpha3: string | null | undefined, size: 40 | 80 = 40): string | null {
  if (!alpha3) return null;
  const a2 = A3_TO_A2[alpha3.toUpperCase()];
  return a2 ? `https://flagcdn.com/w${size}/${a2}.png` : null;
}

export function countryName(alpha3: string | null | undefined): string | null {
  if (!alpha3) return null;
  const names: Record<string, string> = {
    NED: "Netherlands", GBR: "United Kingdom", MON: "Monaco", GER: "Germany",
    ESP: "Spain", AUS: "Australia", CAN: "Canada", FRA: "France", ITA: "Italy",
    JPN: "Japan", MEX: "Mexico", BRA: "Brazil", THA: "Thailand", CHN: "China",
    USA: "United States", FIN: "Finland", DEN: "Denmark", NZL: "New Zealand",
    ARG: "Argentina", BEL: "Belgium", AUT: "Austria", SUI: "Switzerland",
    SWE: "Sweden", POL: "Poland",
  };
  return names[alpha3.toUpperCase()] ?? alpha3.toUpperCase();
}

/** Two-letter typographic mark for a team name (used instead of unlicensed logos). */
export function teamMark(teamName: string): string {
  const clean = teamName
    .replace(/\b(racing|team|f1|formula 1?|scuderia|moneygram|haas automation|visa cash app|stake|kick|sauber)\b/gi, "")
    .replace(/[^a-zA-Z ]/g, " ")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return teamName.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * 2026-grid nationality enrichment (ISO alpha-3), sourced from the Jolpica
 * drivers API (verified 2026-10-17). Used only when OpenF1 returns
 * country_code: null for a driver — metadata, never timing data.
 */
export const DRIVER_NATIONALITY_2026: Record<number, string> = {
  1: "GBR", 3: "NED", 5: "BRA", 6: "FRA", 10: "FRA", 11: "MEX", 12: "ITA",
  14: "ESP", 16: "MON", 18: "CAN", 22: "JPN", 23: "THA", 27: "GER",
  30: "NZL", 31: "FRA", 41: "GBR", 43: "ARG", 44: "GBR", 55: "ESP",
  63: "GBR", 77: "FIN", 81: "AUS", 87: "GBR",
};
