import { NextResponse } from "next/server";

import { sendOperationalAlert } from "@/lib/monitoring";
import {
  buildWebhookPayloadHash,
  processStripeWebhookEvent,
  getStripeWebhookEvent,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    await sendOperationalAlert({
      source: "stripe-webhook",
      level: "warning",
      summary: "Rejected Stripe webhook without signature",
      details: "Incoming webhook request is missing stripe-signature header.",
      context: {
        path: "/api/webhooks/stripe",
      },
    });

    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();

  try {
    const event = getStripeWebhookEvent(body, signature);
    await processStripeWebhookEvent(event, {
      payloadBody: body,
      signatureHeader: signature,
      request: {
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    await sendOperationalAlert({
      source: "stripe-webhook",
      level: "error",
      summary: "Stripe webhook processing failed",
      details: error instanceof Error ? error.message : "Webhook processing failed.",
      context: {
        path: "/api/webhooks/stripe",
        payloadHash: buildWebhookPayloadHash(body),
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 400 },
    );
  }
}