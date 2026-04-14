import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendOperationalAlert } from "@/lib/monitoring";

describe("sendOperationalAlert", () => {
  const originalWebhook = process.env.ALERT_WEBHOOK_URL;
  const originalToken = process.env.ALERT_WEBHOOK_BEARER_TOKEN;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env.ALERT_WEBHOOK_URL = originalWebhook;
    process.env.ALERT_WEBHOOK_BEARER_TOKEN = originalToken;
  });

  it("does not call fetch when webhook is not configured", async () => {
    delete process.env.ALERT_WEBHOOK_URL;

    await sendOperationalAlert({
      source: "stripe-webhook",
      level: "error",
      summary: "Webhook failed",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts formatted payload when webhook is configured", async () => {
    process.env.ALERT_WEBHOOK_URL = "https://alerts.example.com/hook";
    process.env.ALERT_WEBHOOK_BEARER_TOKEN = "token123";
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await sendOperationalAlert({
      source: "portal-delivery",
      level: "warning",
      summary: "Delivery provider unavailable",
      details: "No provider configured",
      context: {
        purpose: "CONSENT",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://alerts.example.com/hook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        }),
      }),
    );
  });
});
