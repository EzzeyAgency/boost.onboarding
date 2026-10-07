import { createSubmission } from "@/lib/db";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import { json, readJson } from "@/lib/respond";
import { firstIssue, getFormStatus, getGoogleAccessStatus, onboardingInput } from "@/lib/validation";

export async function POST(request: Request) {
  if (rateLimited(clientKey(request, "onboarding"))) {
    return json({ error: "Too many submissions from this connection. Please wait a few minutes and try again." }, 429);
  }
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "We could not read your onboarding. Please try again." }, 400);

  // Honeypot: real customers never see or fill this field.
  if ((body as Record<string, unknown>).companyWebsite) return json({ ok: true, formStatus: "customer_action_pending", googleAccessStatus: "customer_action_pending" });

  const parsed = onboardingInput.safeParse(body);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    return json({ error: issue.message, step: issue.step }, 400);
  }

  const input = parsed.data;
  const googleAccessStatus = getGoogleAccessStatus(input);
  const formStatus = getFormStatus(googleAccessStatus);

  try {
    await createSubmission({
      submissionType: "onboarding",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      companyName: input.companyName,
      businessRole: input.businessRole || null,
      formStatus,
      googleProfileStatus: input.googleProfileState,
      googleAccessStatus,
      supportTopic: googleAccessStatus === "support_needed" ? "Onboarding support" : null,
      message: input.googleAccessBlocker || input.setupHelp || input.leadChallenges || null,
      answers: input,
    });
  } catch (error) {
    console.error("onboarding insert failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "We could not save your onboarding right now. Please try again in a moment." }, 500);
  }

  return json({ ok: true, formStatus, googleAccessStatus });
}
