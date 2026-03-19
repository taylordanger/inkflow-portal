import type {
  DomainPageContent,
  Metric,
  ModuleCard,
  TimelineEvent,
  WorkflowColumn,
} from "@/types/studio";

export const studioMetrics: Metric[] = [
  {
    label: "New leads this week",
    value: "38",
    delta: "+12% from last week",
  },
  {
    label: "Deposits pending",
    value: "7",
    delta: "2 at risk after 48h",
  },
  {
    label: "Consent completion",
    value: "91%",
    delta: "Auto-reminders on",
  },
  {
    label: "Aftercare replies",
    value: "14",
    delta: "3 need artist follow-up",
  },
];

export const workflowColumns: WorkflowColumn[] = [
  {
    stage: "New inquiries",
    accent: "from-[var(--ember)]/40 to-transparent",
    cards: [
      {
        client: "Rhea M.",
        artist: "Kai",
        note: "Botanical shoulder piece, medium scale, wants consult Friday.",
      },
      {
        client: "Devin T.",
        artist: "Mara",
        note: "Walk-in converted from Instagram DM, collecting references.",
      },
    ],
  },
  {
    stage: "Awaiting deposit",
    accent: "from-[var(--brass)]/45 to-transparent",
    cards: [
      {
        client: "Noah C.",
        artist: "Kai",
        note: "$150 hold requested, follow-up scheduled for tonight.",
      },
      {
        client: "Harper J.",
        artist: "Mara",
        note: "Sleeve consultation approved, invoice opens in 2 hours.",
      },
    ],
  },
  {
    stage: "Design review",
    accent: "from-[var(--teal)]/45 to-transparent",
    cards: [
      {
        client: "Ari L.",
        artist: "Sol",
        note: "Final linework sent. Awaiting placement confirmation.",
      },
      {
        client: "Micah P.",
        artist: "Sol",
        note: "Requested one small shading revision before lock.",
      },
    ],
  },
  {
    stage: "Ready to tattoo",
    accent: "from-white/30 to-transparent",
    cards: [
      {
        client: "Sage N.",
        artist: "Kai",
        note: "Consent complete, aftercare queued, prep board printed.",
      },
      {
        client: "Elio R.",
        artist: "Mara",
        note: "Deposit captured, stencil approved, session tomorrow 1:30 PM.",
      },
    ],
  },
];

export const moduleCards: ModuleCard[] = [
  {
    name: "Clients",
    href: "/clients",
    eyebrow: "CRM",
    summary: "Centralized client records with references, placement notes, allergies, and artist history.",
  },
  {
    name: "Consultations",
    href: "/consultations",
    eyebrow: "Pipeline",
    summary: "Capture intake, assign artists, set consult windows, and convert serious leads faster.",
  },
  {
    name: "Design approvals",
    href: "/design-approvals",
    eyebrow: "Review",
    summary: "Ship design concepts, collect revision notes, and freeze final artwork before the appointment.",
  },
  {
    name: "Deposits",
    href: "/deposits",
    eyebrow: "Payments",
    summary: "Track holds, refund policies, late payment risk, and unlock bookings only after confirmation.",
  },
  {
    name: "Appointments",
    href: "/appointments",
    eyebrow: "Calendar",
    summary: "Run artist schedules, prep windows, reschedules, and multi-session pieces from one place.",
  },
  {
    name: "Consent forms",
    href: "/consent-forms",
    eyebrow: "Compliance",
    summary: "Store waivers, signatures, and session-specific health notes ahead of needle-down time.",
  },
  {
    name: "Aftercare",
    href: "/aftercare",
    eyebrow: "Retention",
    summary: "Send tailored aftercare instructions, healing check-ins, and upsell touch-up bookings.",
  },
];

export const studioTimeline: TimelineEvent[] = [
  {
    time: "10:00",
    title: "Morning consult block",
    detail: "3 new consults routed to Kai and Mara with intake notes prefilled.",
  },
  {
    time: "12:30",
    title: "Deposit chase automation",
    detail: "Two gentle reminders go out before same-day consult holds expire.",
  },
  {
    time: "15:00",
    title: "Design lock review",
    detail: "Artists approve final stencils and flag last-minute revision risk.",
  },
  {
    time: "20:00",
    title: "Healing check-in",
    detail: "Aftercare messages queue automatically for sessions completed seven days ago.",
  },
];

export const domainContent: Record<string, DomainPageContent> = {
  clients: {
    title: "Clients",
    eyebrow: "Relationship layer",
    description:
      "Give every artist a shared source of truth for client history, references, health notes, and session context.",
    highlights: [
      "Unified client cards with placement photos and prior-session notes.",
      "Artist-visible allergy, medication, and healing flags.",
      "Reference image collections attached to the same record as the booking.",
    ],
    checklist: [
      "Client profile and search",
      "Reference uploads",
      "Artist ownership and notes",
      "Session history timeline",
    ],
  },
  consultations: {
    title: "Consultations",
    eyebrow: "Lead conversion",
    description:
      "Turn scattered DMs and web forms into a structured consult queue with artist assignment and conversion tracking.",
    highlights: [
      "Intake form fields tuned for tattoo work, not generic CRM data.",
      "Automatic stage movement from inquiry to consult booked.",
      "Fast artist triage by style, budget, placement, and size.",
    ],
    checklist: [
      "Intake pipeline",
      "Artist assignment rules",
      "Consult scheduling",
      "Lead source tracking",
    ],
  },
  "design-approvals": {
    title: "Design approvals",
    eyebrow: "Creative review",
    description:
      "Keep artwork review precise and documented so artists stop chasing feedback across email and DMs.",
    highlights: [
      "Versioned concept uploads with locked revision rounds.",
      "Client approvals recorded before the session starts.",
      "Clear separation between placement edits and art edits.",
    ],
    checklist: [
      "Concept upload",
      "Revision requests",
      "Final approval lock",
      "Artist-only notes",
    ],
  },
  deposits: {
    title: "Deposits",
    eyebrow: "Revenue control",
    description:
      "Protect artist time with deposit rules that are visible, enforceable, and directly tied to bookings.",
    highlights: [
      "Pending, paid, and expired holds at a glance.",
      "Refund-policy visibility before reschedule decisions.",
      "Risk flags for leads likely to ghost before payment.",
    ],
    checklist: [
      "Deposit ledger",
      "Reminder automations",
      "Refund policy state",
      "Booking gate enforcement",
    ],
  },
  appointments: {
    title: "Appointments",
    eyebrow: "Studio calendar",
    description:
      "Coordinate artist time, prep windows, and multi-session work without losing the context around each booking.",
    highlights: [
      "Session length, prep time, and break windows on the same board.",
      "Reschedule logic that respects deposit state.",
      "Daily run sheet for front desk and artists.",
    ],
    checklist: [
      "Artist calendar views",
      "Prep and cleanup buffers",
      "Reschedule flow",
      "Session reminders",
    ],
  },
  "consent-forms": {
    title: "Consent forms",
    eyebrow: "Documentation",
    description:
      "Collect waivers digitally and keep the signed record attached to the exact session it belongs to.",
    highlights: [
      "Pre-session digital forms reduce front-desk bottlenecks.",
      "Signed waivers and health flags stored together.",
      "Re-consent prompts for repeat clients when details change.",
    ],
    checklist: [
      "Digital waiver template",
      "Signature capture",
      "Session-linked records",
      "Health flag review",
    ],
  },
  aftercare: {
    title: "Aftercare",
    eyebrow: "Retention and healing",
    description:
      "Turn aftercare into a structured follow-up channel that improves healing outcomes and creates repeat business.",
    highlights: [
      "Artist-specific instruction sets by tattoo style and placement.",
      "Scheduled healing check-ins with reply tracking.",
      "Touch-up and future-booking prompts when the timing is right.",
    ],
    checklist: [
      "Aftercare templates",
      "Healing timeline messages",
      "Reply escalation",
      "Touch-up offers",
    ],
  },
};