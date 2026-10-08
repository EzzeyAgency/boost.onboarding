import "server-only";
import { webhookUrlFor, type WebhookEvent } from "@/lib/webhook-routing";

export type { WebhookEvent };

/** Sends an event to its HighLevel inbound webhook, if one is configured. Never blocks or fails a submission. */
export async function sendWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  const url = webhookUrlFor(event);
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
