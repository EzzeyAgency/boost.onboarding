export type WebhookEvent = "onboarding.submitted" | "onboarding.progress_saved" | "support.submitted";

/**
 * Where each event goes. A support-only or onboarding-only URL wins; HIGHLEVEL_WEBHOOK_URL is the catch-all.
 * Lets support requests feed their own HighLevel workflow without receiving onboarding events.
 */
export function webhookUrlFor(event: WebhookEvent, env: Record<string, string | undefined> = process.env) {
  const specific = event === "support.submitted" ? env.HIGHLEVEL_SUPPORT_WEBHOOK_URL : env.HIGHLEVEL_ONBOARDING_WEBHOOK_URL;
  return specific || env.HIGHLEVEL_WEBHOOK_URL || null;
}
