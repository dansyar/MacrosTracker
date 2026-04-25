# MacrosTracker

Mobile-first calorie & macro tracker with AI photo analysis. Built with Next.js
14 (App Router), TypeScript, Tailwind, Vercel Postgres, NextAuth, and the
Anthropic Claude API.

## Features

- Onboarding with Mifflin-St Jeor TDEE + auto macro targets
- Dashboard: progress ring, macro bars, water tracker, weight trend, streak
- Food log grouped by meal with running totals
- **Add food via photo** — Claude vision analyses the image and returns macros
- Manual food entry
- Exercise log with optional **AI calorie-burn estimation** from text
- History: 7/30 day calorie line chart, weekly macro averages, weight trend
- NextAuth credentials auth, route protection via middleware
- Dark mode by default, bottom nav, toast notifications

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- `@vercel/postgres`
- NextAuth.js (Credentials)
- `@anthropic-ai/sdk` — model `claude-sonnet-4-20250514` (vision)
- Recharts for charts

## Setup

1. **Install deps**

   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env.local` and fill in:

   ```
   POSTGRES_URL=...
   POSTGRES_URL_NON_POOLING=...
   NEXTAUTH_SECRET=... # openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3000
   ANTHROPIC_API_KEY=...
   ```

3. **Run migrations**

   ```bash
   npm run db:migrate
   ```

4. **Dev**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying to Vercel

- Push the repo, import in Vercel
- Attach a Vercel Postgres database — env vars auto-populate
- Add `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`
- Run `npm run db:migrate` once locally pointed at the Postgres URL (or use the
  Vercel Postgres SQL UI to paste `db/schema.sql`).

## Project layout

- `app/(app)/*` — authenticated pages (dashboard, food-log, log-food, log-exercise, history, profile)
- `app/login`, `app/register`, `app/onboarding` — public/auth flow
- `app/api/*` — REST endpoints
- `lib/` — db helpers, auth options, macro math, dates, Anthropic client
- `components/` — `BottomNav`, `ProgressRing`, `MacroBar`, `DateNav`
- `db/schema.sql` — database schema

## Notes

- The Claude API key is **only** read in server routes (`app/api/analyse-food`,
  `app/api/analyse-exercise`) — it is never sent to the client.
- Photos are analysed in-memory and not stored. To persist images, add a
  Vercel Blob upload step in `analyse-food` and pass `photo_url` when saving.
- Streak counts consecutive days (ending at the selected date) with at least
  one food log entry.
