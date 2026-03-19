import { DeliveryChannel, type ClientPortalPurpose } from "@prisma/client";
import { Resend } from "resend";
import twilio from "twilio";

import { getPortalPath } from "@/lib/portals";

export type DeliveryAttemptResult =
  | { status: "sent"; channel: DeliveryChannel; target: string }
  | { status: "unavailable"; reason: string }
  | { status: "failed"; reason: string };

function buildPortalUrl(path: string) {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, appUrl).toString();
}

function normalizePhoneNumber(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+1${digits}`;
}

export async function deliverPortalLink(input: {
  purpose: ClientPortalPurpose;
  token: string;
  clientName: string;
  email: string;
  phone: string;
}): Promise<DeliveryAttemptResult> {
  const path = getPortalPath(input.purpose, input.token);
  const portalUrl = buildPortalUrl(path);

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && resendFrom) {
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: resendFrom,
        to: input.email,
        subject:
          input.purpose === "CONSENT"
            ? "Complete your Inkflow tattoo waiver"
            : "Review your Inkflow tattoo design",
        text:
          input.purpose === "CONSENT"
            ? `Hi ${input.clientName}, complete your tattoo waiver here: ${portalUrl}`
            : `Hi ${input.clientName}, review your tattoo design here: ${portalUrl}`,
      });

      return {
        status: "sent",
        channel: DeliveryChannel.EMAIL,
        target: input.email,
      };
    } catch (error) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "Email delivery failed.",
      };
    }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (sid && authToken && fromNumber) {
    try {
      const client = twilio(sid, authToken);
      const to = normalizePhoneNumber(input.phone);

      await client.messages.create({
        from: fromNumber,
        to,
        body:
          input.purpose === "CONSENT"
            ? `Inkflow waiver for ${input.clientName}: ${portalUrl}`
            : `Inkflow design review for ${input.clientName}: ${portalUrl}`,
      });

      return {
        status: "sent",
        channel: DeliveryChannel.SMS,
        target: to,
      };
    } catch (error) {
      return {
        status: "failed",
        reason: error instanceof Error ? error.message : "SMS delivery failed.",
      };
    }
  }

  return {
    status: "unavailable",
    reason: "No delivery provider configured. Add Resend or Twilio credentials.",
  };
}