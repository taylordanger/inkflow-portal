import { createHash } from "node:crypto";

import { PaymentProvider } from "@prisma/client";
import Stripe from "stripe";

import { captureDepositPayment, recordFailedDeposit, refundDeposit } from "@/lib/consultations";
import { prisma } from "@/lib/db";
import type { AuditRequestContext } from "@/lib/audit";

type PaymentHandlers = {
  captureDepositPayment: typeof captureDepositPayment;
  recordFailedDeposit: typeof recordFailedDeposit;
  refundDeposit: typeof refundDeposit;
};

type PaymentWebhookStore = Pick<typeof prisma, "paymentWebhookEvent">;

export type StripeWebhookMutation =
  | {
      kind: "capture";
      consultationId: string | null;
      amount: number;
      externalReference: string;
      note: string;
    }
  | {
      kind: "failure";
      consultationId: string | null;
      externalReference: string;
      reason: string;
    }
  | {
      kind: "refund";
      consultationId: string | null;
      amount: number;
      externalReference: string;
      note: string;
    }
  | {
      kind: "ignore";
      consultationId: string | null;
    };

const defaultHandlers: PaymentHandlers = {
  captureDepositPayment,
  recordFailedDeposit,
  refundDeposit,
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  return new Stripe(secretKey);
}

export function getStripeWebhookEvent(body: string, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }

  return getStripeClient().webhooks.constructEvent(body, signature, webhookSecret);
}

function getConsultationIdFromStripeObject(object: {
  metadata?: Record<string, string> | null;
}) {
  return object.metadata?.consultationId ?? null;
}

function convertAmountFromCents(amount: number | null | undefined) {
  if (!amount) {
    return 0;
  }

  return Math.round(amount / 100);
}

export function buildWebhookPayloadHash(payloadBody: string) {
  return createHash("sha256").update(payloadBody).digest("hex");
}

export function mapStripeWebhookEvent(event: Stripe.Event): StripeWebhookMutation {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        kind: "capture",
        consultationId: getConsultationIdFromStripeObject(paymentIntent),
        amount: convertAmountFromCents(paymentIntent.amount_received || paymentIntent.amount),
        externalReference: paymentIntent.id,
        note: `Stripe payment succeeded (${paymentIntent.id}).`,
      };
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        kind: "failure",
        consultationId: getConsultationIdFromStripeObject(paymentIntent),
        externalReference: paymentIntent.id,
        reason: paymentIntent.last_payment_error?.message ?? `Stripe payment failed (${paymentIntent.id}).`,
      };
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      return {
        kind: "refund",
        consultationId: getConsultationIdFromStripeObject(charge),
        amount: convertAmountFromCents(charge.amount_refunded),
        externalReference: charge.id,
        note: `Stripe refund processed (${charge.id}).`,
      };
    }
    default:
      return {
        kind: "ignore",
        consultationId: getConsultationIdFromStripeObject(
          event.data.object as { metadata?: Record<string, string> | null },
        ),
      };
  }
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  options?: {
    request?: AuditRequestContext;
    payloadBody?: string;
    signatureHeader?: string;
    prismaClient?: PaymentWebhookStore;
    handlers?: PaymentHandlers;
  },
) {
  const prismaClient = options?.prismaClient ?? prisma;
  const handlers = options?.handlers ?? defaultHandlers;
  const payloadBody = options?.payloadBody ?? JSON.stringify(event);
  const payloadHash = buildWebhookPayloadHash(payloadBody);

  const existing = await prismaClient.paymentWebhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (existing) {
    await prismaClient.paymentWebhookEvent.update({
      where: { eventId: event.id },
      data: {
        replayCount: { increment: 1 },
        lastReplayedAt: new Date(),
      },
    });

    return { handled: true, duplicate: true };
  }

  const actor = {
    name: "Stripe webhook",
  };

  const mutation = mapStripeWebhookEvent(event);
  const consultationId = mutation.consultationId;

  switch (mutation.kind) {
    case "capture": {
      if (consultationId) {
        await handlers.captureDepositPayment(
          {
            consultationId,
            amount: mutation.amount,
            note: mutation.note,
            externalReference: mutation.externalReference,
          },
          actor,
          options?.request,
        );
      }
      break;
    }
    case "failure": {
      if (consultationId) {
        await handlers.recordFailedDeposit(
          {
            consultationId,
            reason: mutation.reason,
            externalReference: mutation.externalReference,
          },
          actor,
          options?.request,
        );
      }
      break;
    }
    case "refund": {
      if (consultationId) {
        await handlers.refundDeposit(
          {
            consultationId,
            amount: mutation.amount,
            note: mutation.note,
            externalReference: mutation.externalReference,
          },
          actor,
          options?.request,
        );
      }
      break;
    }
    case "ignore":
      break;
  }

  await prismaClient.paymentWebhookEvent.create({
    data: {
      provider: PaymentProvider.STRIPE,
      eventId: event.id,
      eventType: event.type,
      consultationId,
      signatureHeader: options?.signatureHeader ?? "",
      payloadHash,
      payloadBody,
      signatureVerifiedAt: new Date(),
    },
  });

  return { handled: true, duplicate: false };
}