import { getDraftByTokenHash, saveDraft } from "@/lib/db";
import { googleProfileLabel } from "@/lib/form";
import { clientKey, rateLimited } from "@/lib/rate-limit";
import { json, readJson } from "@/lib/respond";
import { hashToken, newToken } from "@/lib/tokens";
import { draftInput, firstIssue, getGoogleAccessStatus } from "@/lib/validation";
import { originOf, sendWebhook } from "@/lib/webhook";

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);

/** Save progress. Creates a new resume link, or updates the draft for an existing one. */
export async function POST(request: Request) {
  if (rateLimited(clientKey(request, "drafts"), 120)) return json({ error: "You're saving very quickly. Please wait a minute and try again." }, 429);
  const body = await readJson(request);
  const parsed = draftInput.safeParse(body);
  if (!parsed.success) return json({ error: firstIssue(parsed.error).message }, 400);

  const { data, step, notify } = parsed.data;
  const token = parsed.data.token ?? newToken();
  const googleProfileStatus = text(data.googleProfileState, 80);
  try {
    const row = await saveDraft(hashToken(token), {
      email: parsed.data.email,
      firstName: text(data.firstName, 120),
      lastName: text(data.lastName, 120),
      companyName: text(data.companyName, 255),
      googleProfileStatus,
      googleAccessStatus: googleProfileStatus ? getGoogleAccessStatus(data as never) : null,
      step,
      data,
    });
    // A token for a draft that was already submitted cannot be reused; start a fresh draft instead.
    if (!row) return json({ error: "This form was already submitted. Refresh the page to start a new one." }, 409);

    const resumeUrl = `${originOf(request)}/?resume=${token}`;
    if (notify) {
      await sendWebhook("onboarding.progress_saved", {
        email: parsed.data.email,
        firstName: text(data.firstName, 120),
        lastName: text(data.lastName, 120),
        companyName: text(data.companyName, 255),
        googleProfile: googleProfileLabel(googleProfileStatus),
        resumeUrl,
        adminUrl: `${originOf(request)}/leads/drafts/${row.id}`,
      });
    }
    return json({ ok: true, token, resumeUrl, savedAt: row.updatedAt });
  } catch (error) {
    console.error("draft save failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "We couldn't save your progress right now. Your answers are still on this device." }, 500);
  }
}

/** Load a draft with its secret resume token. */
export async function GET(request: Request) {
  if (rateLimited(clientKey(request, "drafts-get"), 60)) return json({ error: "Too many requests. Please wait a minute." }, 429);
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return json({ error: "This link isn't valid." }, 404);
  try {
    const draft = await getDraftByTokenHash(hashToken(token));
    if (!draft) return json({ error: "We couldn't find saved progress for this link. It may have already been submitted." }, 404);
    return json({ data: draft.data, step: draft.step, email: draft.email });
  } catch (error) {
    console.error("draft load failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "We couldn't load your saved progress right now. Please try again." }, 500);
  }
}
