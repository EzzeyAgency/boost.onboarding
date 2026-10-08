import "server-only";

export type WebhookEvent = "onboarding.submitted" | "onboarding.progress_saved" | "support.submitted";

/**
 * Sends an event to the HighLevel inbound webhook (or any automation URL) when HIGHLEVEL_WEBHOOK_URL is set.
 * One URL receives every event; the workflow branches on the "event" field. Never blocks or fails a submission.
 */
export async function sendWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  const url = process.env.HIGHLEVEL_WEBHOOK_URL;
  if (!url) return false;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, sentAt: new Date().toISOString(), ...payload }),
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) console.error("webhook rejected", event, response.status);
    return response.ok;
  } catch (error) {
    console.error("webhook failed", event, error instanceof Error ? error.name : "unknown");
    return false;
  }
}

/** The public origin of this request, used to build links in webhook payloads. */
export function originOf(request: Request) {
  return process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}
