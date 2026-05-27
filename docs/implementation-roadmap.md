# RentReady Planner Implementation Roadmap

Prepared: 2026-05-27

## Direct recommendation

Proceed in two controlled sprints before touching full listing search.

1. Sprint 1: make the current planner sticky and useful without external data.
2. Sprint 2: add a safe rent-market data layer behind a backend/serverless API.
3. Defer apartment listing search until there is traffic, analytics, and confirmed display/data rights.

The primary move is to turn RentReady from a static calculator into a renter decision assistant. The API is useful, but adding it before saved comparisons, sharing, and analytics would be expensive guesswork with nicer branding.

## Why this path

The current MVP already answers a high-intent question: “Can I afford this apartment?” The next version should help users keep, compare, export, and share that answer. That creates retention, SEO value, and monetization surfaces before paying for external data.

A full apartment search portal is the wrong next step. It brings stale listings, licensing restrictions, partner contracts, map UX, duplicate data, and support overhead. That is not an MVP. That is a liability wearing a trench coat.

## Phase 0: Product decision and setup

Goal: choose the next build target and prepare the Batcave properly.

Deliverables:

- Keep RentReady positioned as a planning and decision tool, not a listing marketplace.
- Decide first deployment target: Vercel, Netlify, or Cloudflare Pages/Workers.
- Add analytics provider selection: Plausible, Fathom, or GA4.
- Create a private `.env.local` for local secrets and confirm `.gitignore` excludes it.
- Do not commit API keys, provider tokens, or email-service secrets.

Recommended stack:

- Frontend: current Vite + React + TypeScript app.
- Hosting: Vercel or Netlify for easiest serverless route setup.
- Later low-cost option: Cloudflare Pages + Workers + KV if caching becomes important.
- Email capture: ConvertKit, Beehiiv, MailerLite, or Supabase table behind an API route.
- Analytics: Plausible or Fathom for privacy-friendly lightweight tracking.

Validation:

- `npm run lint` passes.
- `npm run build` passes.
- Deployment preview loads.
- No secrets appear in the frontend bundle, repo, or logs.

## Sprint 1: Utility upgrades without paid APIs

Goal: make the planner worth bookmarking, sharing, and returning to.

Priority build order:

1. Saved comparison state
   - Persist planner inputs and apartment comparisons in localStorage.
   - Add reset/clear controls.
   - Add privacy copy explaining data stays in the browser.

2. Shareable result links
   - Encode non-sensitive calculator values into URL parameters.
   - Avoid putting email, name, or highly sensitive personal details in the URL.
   - Add “copy share link” button.

3. Printable/exportable checklist
   - Add print styles first; PDF export can follow.
   - Create a cleaner checklist section designed for printing.
   - Make the email capture offer specific: “Send me my move-in checklist.”

4. ZIP, bedrooms, and property type fields
   - Add UI fields now even before API integration.
   - Use them to prepare the data model for rent-market context.

5. Analytics events
   - Track calculator completion, apartment comparison changes, checklist print/export, share-link copy, email capture, and affiliate clicks.
   - Do not log income, debts, exact rent values, or email addresses into analytics.

Acceptance criteria:

- User can reload the page and keep saved comparisons.
- User can copy a shareable link and reopen the same broad scenario.
- User can print a clean signing checklist.
- Location/property fields exist and are typed.
- App still works entirely offline from paid APIs.
- Lint/build pass.

Suggested implementation tasks:

- Add `src/types.ts` for shared PlannerInputs, Apartment, and future MarketRent types.
- Add `src/lib/storage.ts` for localStorage read/write with versioning.
- Add `src/lib/shareLink.ts` for URL encode/decode.
- Add `src/lib/analytics.ts` with no-op defaults until a provider is configured.
- Add print-specific CSS for checklist export.

## Sprint 2: Rent market data integration

Goal: add market context safely without exposing paid API keys.

Primary provider: RentCast.

Initial user-facing feature:

- A “Local rent benchmark” card showing whether the target rent appears below, near, or above market for the selected ZIP, bedrooms, and property type.

Do not start with:

- Full listings search.
- Map browsing.
- Lead-gen listing display.
- User accounts.
- Bank/income verification.
- AI chatbot.

Required architecture:

Frontend request:

```text
GET /api/rent-market?zip=19103&beds=1&propertyType=apartment
```

Backend/serverless responsibilities:

- Validate inputs.
- Check cache.
- Call RentCast using `RENTCAST_API_KEY` from environment variables.
- Return only sanitized fields needed by the UI.
- Rate-limit the public endpoint.
- Log provider errors without logging user financial inputs.

Suggested TypeScript contract:

```ts
export type MarketRentResult = {
  zip: string
  bedrooms: number
  propertyType: 'apartment' | 'condo' | 'townhouse' | 'single-family'
  estimatedRent: number | null
  rentRangeLow: number | null
  rentRangeHigh: number | null
  sampleSize?: number
  source: 'mock' | 'rentcast' | 'hud'
  asOf: string
}
```

Implementation pattern:

1. Build the frontend card using mock data first.
2. Add provider abstraction:
   - `mockRentProvider`
   - `rentCastProvider`
   - optional `hudProvider` later
3. Add a serverless API route.
4. Add cache layer:
   - simple in-memory cache for local development
   - provider cache/edge KV later depending on hosting
5. Add graceful failure copy:
   - “Market data is temporarily unavailable. Your affordability result still works.”

Acceptance criteria:

- App works with no API key using mock/sample market data.
- If `RENTCAST_API_KEY` is configured, backend route can fetch market or rent estimate data.
- API key is never exposed in frontend code or browser network responses.
- User sees useful copy when provider data fails.
- Rate limiting and validation exist before public deployment.
- Lint/build pass.

## Sprint 3: Monetization and SEO foundations

Goal: turn usage into measurable acquisition and revenue experiments without damaging trust.

Build next:

- SEO content pages targeting renter-intent queries:
  - How much rent can I afford?
  - How much cash do I need before moving out?
  - Apartment move-in cost checklist.
  - First apartment budget calculator.
  - Rent affordability calculator by city.
- Email capture tied to real utility:
  - Move-in checklist.
  - Apartment comparison worksheet.
  - Application fee risk checklist.
- Affiliate modules, clearly labeled:
  - Renters insurance.
  - Internet setup.
  - Moving supplies/movers.
  - Basic furniture essentials.

Rules:

- Do not overload the calculator with ad sludge.
- Keep affiliate offers contextual and useful.
- Never make the planner feel like it is selling the user while pretending to advise them.

Validation:

- Organic landing pages indexed.
- Analytics events show calculator completions and checklist exports.
- Email capture conversion tracked.
- Affiliate clicks tracked separately from planner usage.

## What to avoid for now

Avoid these until there is real usage data:

- Full rental listing marketplace.
- User accounts and cloud-synced financial profiles.
- Paid subscriptions.
- Bank/income verification.
- Lease document AI analysis.
- Chatbot-first UX.
- Unofficial/scraped real estate APIs.

These are not bad ideas forever. They are bad next ideas.

## Recommended immediate next action

Build Sprint 1 first.

Concrete next implementation task:

> Add localStorage saved comparisons, shareable result links, print/export checklist styling, ZIP/bedroom/property-type fields, and analytics event stubs. Keep all data local and verify lint/build before moving to the RentCast integration.

Once Sprint 1 is verified, start Sprint 2 with mock market data first, then connect RentCast through a serverless backend route only after the environment variable and rate limiting are in place.

## Pre-flight checklist before API work

- RentCast account created by the operator.
- `RENTCAST_API_KEY` stored only in deployment secrets and local `.env.local`.
- Serverless route chosen.
- Public endpoint validation implemented.
- Cache strategy selected.
- Rate limiting implemented.
- Provider failure states designed.
- Analytics live enough to measure whether users actually interact with the market-rent card.

No vault items belong in chat. Ever.
