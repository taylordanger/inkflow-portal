import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import {
  buildWebhookPayloadHash,
  mapStripeWebhookEvent,
  processStripeWebhookEvent,
} from "@/lib/payments";

function createPaymentIntentEvent(overrides?: Partial<Stripe.PaymentIntent>) {
  return {
    id: "evt_payment_success",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_123",
        amount: 12500,
        amount_received: 12500,
        metadata: { consultationId: "consult_123" },
        ...overrides,
      },
    },
  } as Stripe.Event;
}

function createPaymentFailureEvent(overrides?: Partial<Stripe.PaymentIntent>) {
  return {
    id: "evt_payment_failed",
    type: "payment_intent.payment_failed",
    data: {
      object: {
        id: "pi_failed",
        amount: 12500,
        metadata: { consultationId: "consult_123" },
        last_payment_error: { message: "Card declined" },
        ...overrides,
      },
    },
  } as Stripe.Event;
}

function createRefundEvent(overrides?: Partial<Stripe.Charge>) {
  return {
    id: "evt_refund",
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_refund",
        amount_refunded: 8000,
        metadata: { consultationId: "consult_123" },
        ...overrides,
      },
    },
  } as Stripe.Event;
}

describe("mapStripeWebhookEvent", () => {
  it("maps successful payment intents to capture mutations", () => {
    const mutation = mapStripeWebhookEvent(createPaymentIntentEvent());

    expect(mutation).toEqual({
      kind: "capture",
      consultationId: "consult_123",
      amount: 125,
      externalReference: "pi_123",
      note: "Stripe payment succeeded (pi_123).",
    });
  });

  it("maps failed payment intents to failure mutations", () => {
    const mutation = mapStripeWebhookEvent(createPaymentFailureEvent());

    expect(mutation).toEqual({
      kind: "failure",
      consultationId: "consult_123",
      externalReference: "pi_failed",
      reason: "Card declined",
    });
  });

  it("maps refunded charges to refund mutations", () => {
    const mutation = mapStripeWebhookEvent(createRefundEvent());

    expect(mutation).toEqual({
      kind: "refund",
      consultationId: "consult_123",
      amount: 80,
      externalReference: "ch_refund",
      note: "Stripe refund processed (ch_refund).",
    });
  });
});

describe("processStripeWebhookEvent", () => {
  it("archives verified webhook payloads and dispatches capture mutations", async () => {
    const create = vi.fn(async () => undefined);
    const prismaClient = {
      paymentWebhookEvent: {
        findUnique: vi.fn(async () => null),
        create,
        update: vi.fn(async () => undefined),
      },
    };
    const handlers = {
      captureDepositPayment: vi.fn(async () => undefined),
      recordFailedDeposit: vi.fn(async () => undefined),
      refundDeposit: vi.fn(async () => undefined),
    };
    const event = createPaymentIntentEvent();
    const payloadBody = JSON.stringify({ id: event.id, type: event.type });

    const result = await processStripeWebhookEvent(event, {
      payloadBody,
      signatureHeader: "t=1,v1=testsig",
      prismaClient: prismaClient as never,
      handlers,
    });

    expect(result).toEqual({ handled: true, duplicate: false });
    expect(handlers.captureDepositPayment).toHaveBeenCalledWith(
      {
        consultationId: "consult_123",
        amount: 125,
        note: "Stripe payment succeeded (pi_123).",
        externalReference: "pi_123",
      },
      { name: "Stripe webhook" },
      undefined,
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "STRIPE",
        eventId: "evt_payment_success",
        eventType: "payment_intent.succeeded",
        consultationId: "consult_123",
        signatureHeader: "t=1,v1=testsig",
        payloadBody,
        payloadHash: buildWebhookPayloadHash(payloadBody),
      }),
    });
  });

  it("increments replay metadata and does not re-dispatch duplicate events", async () => {
    const prismaClient = {
      paymentWebhookEvent: {
        findUnique: vi.fn(async () => ({ id: "webhook_1" })),
        create: vi.fn(async () => undefined),
        update: vi.fn(async () => undefined),
      },
    };
    const handlers = {
      captureDepositPayment: vi.fn(async () => undefined),
      recordFailedDeposit: vi.fn(async () => undefined),
      refundDeposit: vi.fn(async () => undefined),
    };

    const result = await processStripeWebhookEvent(createRefundEvent(), {
      payloadBody: "{}",
      signatureHeader: "t=2,v1=replay",
      prismaClient: prismaClient as never,
      handlers,
    });

    expect(result).toEqual({ handled: true, duplicate: true });
    expect(prismaClient.paymentWebhookEvent.update).toHaveBeenCalledWith({
      where: { eventId: "evt_refund" },
      data: {
        replayCount: { increment: 1 },
        lastReplayedAt: expect.any(Date),
      },
    });
    expect(handlers.captureDepositPayment).not.toHaveBeenCalled();
    expect(handlers.recordFailedDeposit).not.toHaveBeenCalled();
    expect(handlers.refundDeposit).not.toHaveBeenCalled();
  });
});