# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest on `main` | :white_check_mark: |

APEX F1 is a single-deployed Next.js application; only the current `main`
branch (the live deployment) receives security fixes.

## Reporting a Vulnerability

Please do not open a public issue for security reports.

- Email: hafizhamdani00@gmail.com
- Or use GitHub's private vulnerability reporting on the
  [Security tab](https://github.com/hyderoo/apex-f1/security/advisories/new).

Include steps to reproduce and the impact you see. You will get an
acknowledgement within a few days and a fix or a reasoned reply after triage.

## Scope notes

- The app only reads public motorsport data (OpenF1, Jolpica) and stores
  optional per-user data (accounts, favorites, push subscriptions) in its own
  Supabase project behind row-level security.
- Never commit secrets. Runtime configuration lives in `.env.local` /
  Vercel environment variables; see `.env.example` for the expected keys.
