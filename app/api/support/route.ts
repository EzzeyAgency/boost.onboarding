import { createSubmission } from "@/lib/db";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import { json, readJson } from "@/lib/respond";
import { firstIssue, supportInput } from "@/lib/validation";
import { originOf, sendWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  if (rateLimited(clientKey(request, "support"))) {
    return json({ error: "Too many requests from this connection. Please wait a few minutes and try again." }, 429);
  }
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ error: "We couldn't read your request. Please try again." }, 400);
  if ((body as Record<string, unknown>).companyWebsite) return json({ ok: true });

  const parsed = supportInput.safeParse(body);
  if (!parsed.success) return json({ error: firstIssue(parsed.error).message }, 400);

  const input = parsed.data;
  let id: number;
  try {
    id = await createSubmission({
      submissionType: "support",
      firstName: input.firstName,
      lastName: input.lastName || null,
      email: input.email,
      companyName: input.companyName,
      formStatus: "support_needed",
      googleProfileStatus: null,
      googleAccessStatus: "support_needed",
      supportTopic: input.topic,
      message: input.message,
      answers: input,
    });
  } catch (error) {
    console.error("support insert failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "We couldn't send your request right now. Please try again in a moment." }, 500);
  }

  await sendWebhook("support.submitted", {
    submissionId: id,
    firstName: input.firstName,
    lastName: input.lastName || null,
    email: input.email,
    phone: input.phone || null,
    companyName: input.companyName,
    topic: input.topic,
    message: input.message,
    alreadyTried: input.tried || null,
    fromOnboarding: Boolean(input.fromOnboarding),
    profileUrl: `${originOf(request)}/leads/${id}`,
  });

  return json({ ok: true });
}
