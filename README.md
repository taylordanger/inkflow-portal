# Inkflow Portal

Inkflow Portal is a tattoo studio SaaS concept built with Next.js. The current first pass focuses on the operational workflow that sits between a new inquiry and a healed tattoo.

## Current scope

- Client intake and profile management
- Consultation pipeline
- Design approval workflow
- Deposit tracking
- Appointment scheduling
- Digital consent records
- Aftercare follow-up

## Run locally

```bash
npm run db:push
npm run db:seed
npm test
npm run dev
```

Then open `http://localhost:3000`.

Use `frontdesk@inkflow.local` with password `inkflow-demo` to sign in.

Public client entry points now exist at `/consult` for the studio-wide intake route and `/book/[artistSlug]` for artist-specific booking pages such as `/book/kai-moreno`.

To send real consent or approval links, configure either `RESEND_API_KEY` plus `RESEND_FROM_EMAIL`, or `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`.
To process signed payment webhooks, configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, then point Stripe at `/api/webhooks/stripe` with a `consultationId` stored in the PaymentIntent metadata.

## Project shape

- `src/app` contains the App Router pages.
- `src/components` contains reusable UI building blocks.
- `src/lib/mock-data.ts` contains typed placeholder data for the product shell.
- `src/lib/consultations.ts` contains the Prisma-backed consultation workflow.
- `src/lib/appointments.ts` contains appointment queries for the booking board.
- `src/lib/auth.ts` contains NextAuth credential authentication and session helpers.
- `src/types/studio.ts` contains shared domain types.
- `prisma/schema.prisma` defines the multi-user SQLite data model.

## Working consultation flow

- Front desk can create a new intake from the consultations page.
- Leads move from `New inquiry` to `Consult scheduled` to `Awaiting deposit` to `Design review`.
- Deposit requests and paid status are tracked directly from the consultation queue.
- Paid consults support artist design notes, approval history, and appointment scheduling.
- Scheduled appointments appear on the appointments page from the same database.

## Role rules

- Front desk and owner can request deposits, mark deposits paid, and schedule appointments.
- Artists and owner can add design notes and finalize approval history.
- Clients, appointments, and consent pages are now backed by Prisma data instead of placeholder content.
- Artists only see their assigned consultations and appointments.
- Front desk and owner can send, resend, expire, and mark consent waivers signed.
- Front desk and owner can record partial payments, refunds, and failed payment reasons from the deposits board.

## Dedicated operations pages

- Deposits now has its own Prisma-backed payment queue.
- Design approvals now has its own Prisma-backed artist review workspace.
- Consent forms now support real status mutations from the consent ledger.

## Client portals and audit history

- Client-facing signed links now exist for consent completion and design approval responses.
- Public client intake routes now create `SocialLead` records before front desk converts them into consultations.
- Artist-specific booking pages preserve attribution for the artist profile, campaign link, and source platform.
- Deposit, consent, and approval mutations create audit history so staff actions are traceable.
- Provider-backed email or SMS delivery is used for portal links when Resend or Twilio credentials are configured.
- Delivery failures and missing-provider states are now stored and shown in staff UI.
- Staff surfaces now show a small delivery attempt feed with timestamps and retry counts for consent and approval sends.
- Audit history now captures IP address, user agent, and structured field-level diffs for compliance tracing.
- Signed Stripe webhooks can now drive deposit paid, failed, and refunded states directly into booking locks.
- Stripe webhook receipts now archive the verified signature header, raw payload body, payload hash, and replay counters for stronger payment compliance review.
- Deposit failures, refunds, and short-paid balances automatically lock session readiness until the balance issue is resolved.
- Seed data includes portal links, deposit events, and audit records for local development.

#
