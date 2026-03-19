import { NextResponse } from "next/server";

import { processStripeWebhookEvent, getStripeWebhookEvent } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 400 },
    );
  }
}