#!/usr/bin/env node
import {
  AppointmentStatus,
  ConsultationStage,
  ConsentStatus,
  DepositEventType,
  PortalDeliveryStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();
const lookbackDays = Number.parseInt(process.env.SMOKE_LOOKBACK_DAYS ?? "30", 10);
const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

/** @type {{status: "PASS" | "WARN" | "FAIL", check: string, details: string}[]} */
const results = [];

function addResult(status, check, details) {
  results.push({ status, check, details });
}

function maskSecret(value) {
  if (!value) {
    return "unset";
  }
  if (value.length <= 6) {
    return "set";
  }
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

async function run() {
  const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY);
  const hasStripeWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  if (hasStripeSecret && hasStripeWebhookSecret) {
    addResult("PASS", "Stripe webhook credentials", "Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are configured.");
  } else {
    addResult(
      "FAIL",
      "Stripe webhook credentials",
      `Missing webhook credentials. STRIPE_SECRET_KEY=${maskSecret(process.env.STRIPE_SECRET_KEY)} STRIPE_WEBHOOK_SECRET=${maskSecret(process.env.STRIPE_WEBHOOK_SECRET)}`,
    );
  }

  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER,
  );
  if (hasResend || hasTwilio) {
    addResult(
      "PASS",
      "Portal delivery provider",
      hasResend && hasTwilio
        ? "Resend and Twilio are both configured."
        : hasResend
          ? "Resend is configured."
          : "Twilio is configured.",
    );
  } else {
    addResult(
      "FAIL",
      "Portal delivery provider",
      "No delivery provider configured. Configure Resend or Twilio before beta rollout.",
    );
  }

  if (process.env.ALERT_WEBHOOK_URL) {
    addResult(
      "PASS",
      "Operational alert sink",
      `ALERT_WEBHOOK_URL configured (${maskSecret(process.env.ALERT_WEBHOOK_URL)}).`,
    );
  } else {
    addResult(
      "WARN",
      "Operational alert sink",
      "ALERT_WEBHOOK_URL is not configured. Failures will only be logged to stderr.",
    );
  }

  const webhookCount = await prisma.paymentWebhookEvent.count({
    where: { processedAt: { gte: lookbackStart } },
  });
  if (webhookCount > 0) {
    addResult(
      "PASS",
      "Stripe webhook activity",
      `${webhookCount} webhook events recorded in the last ${lookbackDays} days.`,
    );
  } else {
    addResult(
      "WARN",
      "Stripe webhook activity",
      `No webhook events in the last ${lookbackDays} days. Trigger a staging payment to verify webhook path before release.`,
    );
  }

  const replayedCount = await prisma.paymentWebhookEvent.count({
    where: {
      processedAt: { gte: lookbackStart },
      replayCount: { gt: 0 },
    },
  });
  if (replayedCount > 0) {
    addResult(
      "WARN",
      "Stripe webhook replays",
      `${replayedCount} webhook events were replayed in the last ${lookbackDays} days. Review idempotency behavior and source retries.`,
    );
  } else {
    addResult("PASS", "Stripe webhook replays", "No webhook replay events detected in lookback window.");
  }

  const recentAttempts = await prisma.portalDeliveryAttempt.count({
    where: { attemptedAt: { gte: lookbackStart } },
  });
  const failedAttempts = await prisma.portalDeliveryAttempt.count({
    where: {
      attemptedAt: { gte: lookbackStart },
      status: { in: [PortalDeliveryStatus.FAILED, PortalDeliveryStatus.UNAVAILABLE] },
    },
  });

  if (recentAttempts === 0) {
    addResult(
      "WARN",
      "Portal delivery activity",
      `No portal delivery attempts in the last ${lookbackDays} days. Send consent and approval links during smoke validation.`,
    );
  } else {
    const failureRate = (failedAttempts / recentAttempts) * 100;
    if (failureRate > 20) {
      addResult(
        "FAIL",
        "Portal delivery reliability",
        `${failedAttempts}/${recentAttempts} failed or unavailable attempts (${failureRate.toFixed(1)}%).`,
      );
    } else if (failedAttempts > 0) {
      addResult(
        "WARN",
        "Portal delivery reliability",
        `${failedAttempts}/${recentAttempts} failed or unavailable attempts (${failureRate.toFixed(1)}%).`,
      );
    } else {
      addResult(
        "PASS",
        "Portal delivery reliability",
        `0/${recentAttempts} failed attempts in the last ${lookbackDays} days.`,
      );
    }
  }

  const bookedConsultations = await prisma.consultation.count({
    where: {
      updatedAt: { gte: lookbackStart },
      stage: ConsultationStage.BOOKED,
    },
  });
  addResult(
    bookedConsultations > 0 ? "PASS" : "FAIL",
    "Core flow: booked consultations",
    `${bookedConsultations} consultations reached BOOKED in lookback window.`,
  );

  const depositRequests = await prisma.depositEvent.count({
    where: {
      createdAt: { gte: lookbackStart },
      type: DepositEventType.REQUEST,
    },
  });
  addResult(
    depositRequests > 0 ? "PASS" : "FAIL",
    "Core flow: deposit requests",
    `${depositRequests} deposit request events in lookback window.`,
  );

  const depositPayments = await prisma.depositEvent.count({
    where: {
      createdAt: { gte: lookbackStart },
      type: { in: [DepositEventType.PAYMENT, DepositEventType.PARTIAL_PAYMENT] },
    },
  });
  addResult(
    depositPayments > 0 ? "PASS" : "FAIL",
    "Core flow: deposit payments",
    `${depositPayments} payment capture events in lookback window.`,
  );

  const approvalEvents = await prisma.designApprovalEvent.count({
    where: { createdAt: { gte: lookbackStart } },
  });
  addResult(
    approvalEvents > 0 ? "PASS" : "FAIL",
    "Core flow: design approvals",
    `${approvalEvents} approval events in lookback window.`,
  );

  const signedConsents = await prisma.consentForm.count({
    where: {
      updatedAt: { gte: lookbackStart },
      status: ConsentStatus.SIGNED,
    },
  });
  addResult(
    signedConsents > 0 ? "PASS" : "FAIL",
    "Core flow: signed consents",
    `${signedConsents} signed consent forms in lookback window.`,
  );

  const activeAppointments = await prisma.appointment.count({
    where: {
      updatedAt: { gte: lookbackStart },
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED, AppointmentStatus.COMPLETED] },
    },
  });
  addResult(
    activeAppointments > 0 ? "PASS" : "FAIL",
    "Core flow: scheduled appointments",
    `${activeAppointments} scheduled/rescheduled/completed appointments in lookback window.`,
  );

  if (process.env.SMOKE_BASE_URL) {
    try {
      const response = await fetch(new URL("/api/webhooks/stripe", process.env.SMOKE_BASE_URL), {
        method: "GET",
      });
      if (response.status === 405 || response.status === 400) {
        addResult(
          "PASS",
          "Webhook endpoint reachability",
          `GET /api/webhooks/stripe responded with ${response.status}.`,
        );
      } else {
        addResult(
          "WARN",
          "Webhook endpoint reachability",
          `GET /api/webhooks/stripe returned unexpected status ${response.status}.`,
        );
      }
    } catch (error) {
      addResult(
        "FAIL",
        "Webhook endpoint reachability",
        `Failed to reach SMOKE_BASE_URL: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  } else {
    addResult(
      "WARN",
      "Webhook endpoint reachability",
      "SMOKE_BASE_URL not configured; skipping live endpoint check.",
    );
  }
}

function printResults() {
  console.log("\nInkflow staging smoke check\n");
  for (const result of results) {
    const icon = result.status === "PASS" ? "[PASS]" : result.status === "WARN" ? "[WARN]" : "[FAIL]";
    console.log(`${icon} ${result.check}: ${result.details}`);
  }

  const failed = results.filter((result) => result.status === "FAIL").length;
  const warned = results.filter((result) => result.status === "WARN").length;
  const passed = results.filter((result) => result.status === "PASS").length;

  console.log(`\nSummary: ${passed} passed, ${warned} warnings, ${failed} failed\n`);

  return { failed };
}

try {
  await run();
  const { failed } = printResults();
  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error("\n[FAIL] Smoke check crashed:", error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
}
