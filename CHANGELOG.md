# Changelog

All notable changes to APEX F1 are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Session context during a race weekend**: the dashboard focus, "Latest
  completed" link, live-timing default and every no-key API route
  (leaderboard, weather, race control, strategy, telemetry, replay) now
  resolve to the latest finished session of any type, so once Friday practice
  is done the app follows the current weekend (e.g. Austin Practice 2)
  instead of the previous round's race.

## [1.0.0] - 2026-10-18

First tagged release. The app is live at <https://apex-f1-murex.vercel.app>.

### Added

- **Dashboard**: live timing tower for the latest/next session, countdowns and
  session cards, team badges and driver identity throughout.
- **Race analysis**: race story summary, teammate head-to-head across the
  season, tyre degradation per stint, pit-stop and undercut analyzer.
- **Telemetry**: per-driver lap telemetry with deep links, live delta-time
  readout in lap replay.
- **Race replay**: track-map player with numbered corners, sector boundaries
  and a smoothed circuit outline from recorded data.
- **Strategy tools**: weather vs pace panel (recorded data, honest statistics),
  championship what-if calculator (clearly labelled as simulation).
- **Team Radio Archive**: searchable, grouped radio player.
- **Circuits**: circuit imagery with meeting hero, honest empty states where
  outlines are missing.
- **Personal hub**: favorites with account sync (Supabase), share cards with
  per-pair OG images.
- **Session notifications**: Web Push reminders ahead of sessions, with a
  "send a test notification" flow and a GitHub Actions dispatch backend.
- **PWA**: offline cache of the latest race results, app icons, installable.
- **Data Health page**: real provider probes for OpenF1 and Jolpica.

### Engineering

- CI on every push: lint, strict typecheck, 101 unit tests, Playwright e2e gate.
- Live provider contract tests against OpenF1 + Jolpica for schema drift.
- MIT license, README with real screenshots.

## [Unreleased]

[1.0.0]: https://github.com/hyderoo/apex-f1/releases/tag/v1.0.0
