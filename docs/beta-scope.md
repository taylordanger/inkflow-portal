# Beta Scope Freeze

Date: 2026-04-14
Owner: Product + Engineering

## Beta objective

Validate that studio staff can reliably move a client from intake to appointment readiness with payments, approvals, and consent tracked in one system.

## In-scope for beta

This is the single required beta flow:

1. Intake creation via public routes.
2. Front desk qualification and consultation scheduling.
3. Deposit request, payment state updates, and payment failure handling.
4. Design approval request and client response capture.
5. Appointment scheduling after payment and design readiness.
6. Consent form send, completion tracking, and signed state recording.

## Entry points included

- Public intake: /consult
- Artist booking intake: /book/[artistSlug]
- Staff operations pages:
  - /consultations
  - /deposits
  - /design-approvals
  - /appointments
  - /consent-forms
- Client portals:
  - /portal/design-approval/[token]
  - /portal/consent/[token]

## Out of scope for beta (defer)

- Social inbox expansion beyond current lead capture and conversion behavior.
- Automated reminder campaigns and aftercare messaging automation.
- Non-critical reporting and advanced dashboard analytics.
- Broader CRM enhancements not required for the core beta flow.
- UI polish work that does not change flow success, reliability, or trust.

## Beta launch gates

All gates below must pass before external beta users are invited.

1. Core flow reliability
   - End-to-end happy-path test covers intake through signed consent.
   - Critical failure-path checks cover payment failure, expired portal links, and webhook replay safety.

2. Role and permission safety
   - Server-side authorization enforced for front desk, artist, and owner write actions.
   - Artist visibility restricted to assigned consultations and appointments.

3. Audit and compliance readiness
   - Deposit, consent, and design-approval mutations persist audit records.
   - Consent and approval history can be reviewed from staff surfaces.

4. Delivery and payments operational readiness
   - Portal links send through configured provider paths or fail with clear staff-visible status.
   - Stripe webhook verification and payment state transitions validated in staging.

5. Support readiness
   - Staff smoke-test checklist documented and run on staging.
   - Known limitations and support response expectations documented for beta users.

## Exit criteria for beta

Beta can be considered successful when:

- Teams complete the in-scope flow without engineering intervention for most cases.
- Flow conversion and reliability metrics are stable for at least two weekly cycles.
- No unresolved high-severity issues remain in payments, consent, approvals, or role safety.
