type AlertLevel = "warning" | "error";

type AlertInput = {
  source: "stripe-webhook" | "portal-delivery";
  level: AlertLevel;
  summary: string;
  details?: string;
  context?: Record<string, string | number | boolean | null | undefined>;
};

function truncate(value: string, max = 500) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}

function formatAlert(input: AlertInput) {
  const lines = [
    `[Inkflow Alert] ${input.level.toUpperCase()} ${input.summary}`,
    `source=${input.source}`,
  ];

  if (input.details) {
    lines.push(`details=${truncate(input.details)}`);
  }

  if (input.context) {
    for (const [key, raw] of Object.entries(input.context)) {
      lines.push(`${key}=${String(raw ?? "")}`);
    }
  }

  return lines.join(" | ");
}

export async function sendOperationalAlert(input: AlertInput) {
  const formatted = formatAlert(input);
  console.error(formatted);

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return;
  }

  try {
    const token = process.env.ALERT_WEBHOOK_BEARER_TOKEN;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        text: formatted,
        source: input.source,
        level: input.level,
        summary: input.summary,
        details: input.details ?? null,
        context: input.context ?? null,
      }),
    });

    if (!response.ok) {
      console.error(`[Inkflow Alert] Failed to post alert webhook: ${response.status}`);
    }
  } catch (error) {
    console.error(
      `[Inkflow Alert] Unexpected error posting alert webhook: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}
