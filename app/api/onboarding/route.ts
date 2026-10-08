import { completeDraft, createSubmission } from "@/lib/db";
import { googleProfileLabel } from "@/lib/form";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import { json, readJson } from "@/lib/respond";
import { hashToken } from "@/lib/tokens";
import { firstIssue, getFormStatus, getGoogleAccessStatus, onboardingInput } from "@/lib/validation";
import { originOf, sendWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  if (rateLimited(clientKey(request, "onboarding"))) {
    return json({ error: "Too many submissions from this connection. Please wait a few minutes and try again." }, 429);
  }
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "We couldn't read your answers. Please try again." }, 400);
  const raw = body as Record<string, unknown>;

  // Honeypot: real customers never see or fill this field.
  if (raw.companyWebsite) return json({ ok: true, formStatus: "customer_action_pending", googleAccessStatus: "customer_action_pending" });

  const parsed = onboardingInput.safeParse(raw);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    return json({ error: issue.message, step: issue.step, field: issue.field }, 400);
  }

  const input = parsed.data;
  const googleAccessStatus = getGoogleAccessStatus(input);
  const formStatus = getFormStatus(googleAccessStatus);
  const helpNote = input.googleAccessHelp || input.setupHelp || (input.recoveryIssue ? [input.recoveryIssue, input.recoveryIssueOther].filter(Boolean).join(": ") : "");

  let id: number;
  try {
    id = await createSubmission({
      submissionType: "onboarding",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      companyName: input.companyName,
      businessRole: input.businessRole || null,
      formStatus,
      googleProfileStatus: input.googleProfileState,
      googleAccessStatus,
      supportTopic: googleAccessStatus === "support_needed" ? "Google Business Profile help" : null,
      message: helpNote || input.holdingBack || null,
      answers: input,
    });
  } catch (error) {
    console.error("onboarding insert failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "We couldn't save your answers right now. Please try again in a moment. Your progress is still on this device." }, 500);
  }

  const token = typeof raw.draftToken === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(raw.draftToken) ? raw.draftToken : null;
  if (token) await completeDraft(hashToken(token), id).catch(error => console.error("draft completion failed", error instanceof Error ? error.name : "unknown"));

  await sendWebhook("onboarding.submitted", {
    submissionId: id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    companyName: input.companyName,
    businessRole: input.businessRole,
    website: input.website || null,
    formStatus,
    googleProfile: googleProfileLabel(input.googleProfileState),
    googleAccessStatus,
    needsHelp: googleAccessStatus === "support_needed",
    helpNote: helpNote || null,
    profileUrl: `${originOf(request)}/leads/${id}`,
  });

  return json({ ok: true, formStatus, googleAccessStatus });
}
