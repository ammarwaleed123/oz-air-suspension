# OZ Air Suspension

Bilingual (AR/EN) storefront for an air-suspension shop in 6th of October City.
Next.js (App Router) + Postgres (Neon) + Drizzle ORM.

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Tailwind CSS v4**
- **Drizzle ORM** + `postgres-js` against **Neon** (hosted Postgres)
- **Zod** for validation
- Node **v22.20.0**

## Getting started

```bash
npm install
cp .env.example .env      # then paste your Neon connection string into DATABASE_URL
npm run db:generate       # generate SQL migration from the schema
npm run db:migrate        # apply migrations to Neon
npm run db:seed           # (optional) load sample catalog
npm run dev               # http://localhost:3000  → redirects to /ar
```

> No Docker. The app talks directly to Neon over SSL using the connection
> string in `.env`.

## Project layout

```
src/
  app/
    [locale]/            # ar | en — owns <html lang dir>, header, footer
      layout.tsx
      page.tsx           # home (three category entries)
    not-found.tsx        # self-contained global 404
    globals.css          # Tailwind v4 + theme
  components/            # site header/footer, locale switcher
  db/
    schema.ts            # all tables + relations + inferred types
    client.ts            # request-scoped Drizzle client (Neon, SSL)
    migrate.ts           # CLI migration runner
    seed.ts              # sample catalog
  i18n/
    config.ts            # locales, direction, labels
    index.ts             # getDictionary() (server-only)
    dictionaries/        # ar.ts, en.ts, types.ts (EN = source of truth)
  lib/
    money.ts             # piastres <-> EGP formatting
    schedule.ts          # working-day / 2-day-job date logic (Sunday skipped)
  middleware.ts          # locale prefixing + redirect
drizzle.config.ts
```

## Domain model (key rules)

- **Money** is stored as integer **piastres** everywhere (1 EGP = 100).
- **Air kits**: exactly one per car (`air_kits.car_id` unique). Each kit has up
  to four **parallel setups** (`air_kit_setups`, unique per `setup_type`):
  `low_normal_slow` (55k), `low_fast` (75k), `down_dual` (70k),
  `down_single` (85k) — each with its own bilingual feature list.
- **Coilovers**: several per car, each a single price, identified by
  `brand` + `manufacture_date`.
- **Rims**: standalone, no car link, no install — browsed by raw specs
  (diameter / width / bolt pattern / offset / finish).
- **Installs** (air kits + coilovers) require an account + **10% deposit** to
  lock a slot; balance paid via Paymob/Kashier or cash.
- **Scheduling**: capacity 4 cars/day, each job = 2 working days,
  **Sundays skipped**. A start day is bookable only if it AND its next working
  day are both under capacity. Earliest start = tomorrow. No-show forfeits the
  deposit and reopens the slot. `booking_days` holds one row per occupied day
  for O(1) capacity counts.

## Build roadmap

1. ✅ **Foundation** — project, DB tables, bilingual scaffolding
2. ✅ **Catalog** — air-kit / coilover / rim browse + detail pages, car pickers,
   rim spec filter, working mobile nav
3. ✅ **Accounts + cart** — Auth.js (bcrypt) auth, customer/staff/owner roles,
   server-side cart & 10% deposit, guarded admin shell. (Checkout/payment via
   Paymob/Kashier still to come.)
4. ✅ **Scheduling engine** — race-safe 2-day slot booking (Sunday skipped),
   15-min hold + simulated deposit, air-kit coilover gate, owner/staff schedule
5. Extras — Builds gallery, Air-vs-Coilovers explainer, WhatsApp/owner pings, deploy

## Known decisions / revisit later

- Catalog list pages use `force-dynamic` for now; revisit caching strategy in
  the step 6 hardening pass once admin-driven cache invalidation exists.

## Pre-launch hardening checklist

These MUST NOT be forgotten before going public:

- [ ] **HARD GATE — remove test accounts.** Delete **all `@test.local`
      accounts** from the database and create the real owner via
      `npm run create:user -- owner <email> <password> "<name>" <phone>`.
      The seeded `owner@test.local` / `staff@test.local` / `customer@test.local`
      accounts have known passwords and must never reach production.
- [ ] **Login brute-force / rate limiting** is NOT yet implemented. Add
      throttling / lockout on the credentials login in the step 6 hardening pass.
- [ ] **Catalog caching** — largely resolved: owner product/car edits now call
      `revalidatePath` so the catalog refreshes on change. Still worth revisiting
      the broad `force-dynamic` choice on list pages (see "Known decisions" above)
      for a tighter caching strategy.
- [ ] **Production QR URL** — receipt QR codes and `/admin/lookup` links are built
      from `NEXT_PUBLIC_SITE_URL`. It defaults to `http://localhost:3000`; set it to
      the real public domain in production or the printed QR codes point at localhost.
- [ ] **Swap image storage to the cloud.** `src/lib/storage.ts` currently writes
      uploaded images to local disk (`public/uploads/`, gitignored, dev only).
      Replace `saveImage`/`deleteImage` with Vercel Blob or Cloudflare R2 before
      launch — local disk does not persist on serverless hosts.
