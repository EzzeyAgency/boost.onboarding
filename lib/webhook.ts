import "server-only";
import { ONBOARDING_INFO, webhookUrlFor, zapierUrlFor, type WebhookEvent } from "@/lib/webhook-routing";

export { ONBOARDING_INFO };
export type { WebhookEvent };

async function post(url: string, label: string, event: WebhookEvent, body: string) {
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(4000) });
    if (!response.ok) console.error(`${label} webhook rejected`, event, response.status);
    return response.ok;
  } catch (error) {
    console.error(`${label} webhook failed`, event, error instanceof Error ? error.name : "unknown");
    return false;
  }
}

/**
 * Sends an event to HighLevel and, for onboarding events, Zapier, when their URLs are configured.
 * Both are sent in parallel. Never blocks or fails a customer's submission.
 */
export async function sendWebhook(event: WebhookEvent, payload: Record<string, unknown>) {
  const body = JSON.stringify({ event, sentAt: new Date().toISOString(), ...payload });
  const targets = [[webhookUrlFor(event), "HighLevel"], [zapierUrlFor(event), "Zapier"]].filter((target): target is [string, string] => Boolean(target[0]));
  const results = await Promise.all(targets.map(([url, label]) => post(url, label, event, body)));
  return results.some(Boolean);
}

/** The public origin of this request, used to build links in webhook payloads. */
export function originOf(request: Request) {
  return process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

/** Full link to a customer's page, e.g. https://boostclients.ezzey.com/smith-plumbing */
export function clientPageUrl(request: Request, slug: string) {
  return `${originOf(request)}/${slug}`;
}
