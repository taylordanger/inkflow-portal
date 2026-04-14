# Staging Smoke Checklist

Use this checklist before each beta rollout.

## Automated preflight

Run:

```bash
npm run smoke:staging
```

Environment variables used by the smoke script:

- `SMOKE_LOOKBACK_DAYS` (optional, default `30`)
- `SMOKE_BASE_URL` (optional, enables live webhook endpoint reachability check)

The command exits non-zero when required checks fail.

## Required pass criteria

1. Stripe webhook credentials are configured.
2. At least one portal delivery provider is configured (Resend or Twilio).
3. Core flow evidence exists in the lookback window:
   - deposit request events
   - deposit payment events
   - design approval events
   - booked consultations
   - signed consents
   - scheduled/rescheduled/completed appointments
4. Portal delivery failure rate is <= 20% in the lookback window.

## Warnings to review before release

1. No recent Stripe webhook events.
2. Webhook replay events present.
3. Alert webhook not configured.
4. Live endpoint reachability skipped because `SMOKE_BASE_URL` is unset.

## Manual verification (post-script)

1. Create one test intake and move it through consult, deposit, approval, appointment, and signed consent.
2. Confirm a Stripe test event appears in `PaymentWebhookEvent`.
3. Confirm a portal send attempt appears in `PortalDeliveryAttempt`.
4. Confirm staff UI shows audit entries for deposit, approval, and consent mutations.
5. Review monitoring channel for any `stripe-webhook` or `portal-delivery` alerts.
