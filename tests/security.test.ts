import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail } from "@/lib/admin";
import { safeHttpUrl } from "@/lib/links";
import { rateLimited } from "@/lib/rate-limit";
import { baseOnboarding } from "./fixtures";

const adminState = { signedIn: false, isAdmin: false, email: null as string | null };
const db = {
  createSubmission: vi.fn(async () => 1),
  listSubmissions: vi.fn(async () => [{ id: 1 }]),
  getSubmissionById: vi.fn(async () => ({ id: 1 })),
  saveDraft: vi.fn(async () => ({ id: 7, createdAt: new Date(), updatedAt: new Date() }) as { id: number; createdAt: Date; updatedAt: Date } | null),
  getDraftByTokenHash: vi.fn(async () => ({ data: { firstName: "Jane" }, step: 3, email: "jane@example.com" }) as unknown),
  completeDraft: vi.fn(async () => 7 as number | null),
  ensureClientPage: vi.fn(async () => ({ page: { slug: "smith-plumbing" }, created: true })),
  listOpenDrafts: vi.fn(async () => []),
};
const webhook = { sendWebhook: vi.fn(async () => true), originOf: () => "https://boost.test", clientPageUrl: (_r: Request, slug: string) => `https://boost.test/${slug}`, ONBOARDING_INFO: "Onboarding Info" };

vi.mock("@/auth", () => ({ getAdmin: async () => adminState }));
vi.mock("@/lib/db", () => db);
vi.mock("@/lib/webhook", () => webhook);

const { GET: listRoute } = await import("@/app/api/submissions/route");
const { GET: detailRoute } = await import("@/app/api/submissions/[id]/route");
const { POST: onboardingRoute } = await import("@/app/api/onboarding/route");
const { POST: supportRoute } = await import("@/app/api/support/route");
const { POST: saveDraftRoute, GET: loadDraftRoute } = await import("@/app/api/drafts/route");
const { GET: listDraftsRoute } = await import("@/app/api/drafts/list/route");
const { hashToken } = await import("@/lib/tokens");

let ip = 0;
const post = (body: unknown) => new Request("https://boost.test/api", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` }, body: JSON.stringify(body) });

beforeEach(() => {
  Object.assign(adminState, { signedIn: false, isAdmin: false, email: null });
  vi.clearAllMocks();
});

describe("admin allowlist", () => {
  it("matches case-insensitively and rejects others", () => {
    expect(isAdminEmail("Analytics@Ezzey.com", "analytics@ezzey.com, ops@ezzey.com")).toBe(true);
    expect(isAdminEmail("someone@gmail.com", "analytics@ezzey.com")).toBe(false);
    expect(isAdminEmail(null, "analytics@ezzey.com")).toBe(false);
    expect(isAdminEmail("x@ezzey.com", "")).toBe(false);
  });
});

describe("protected submission APIs", () => {
  it("returns a generic 404 and never queries data for signed-out users", async () => {
    expect((await listRoute(new Request("https://boost.test/api/submissions"))).status).toBe(404);
    expect((await detailRoute(new Request("https://boost.test/api/submissions/1"), { params: Promise.resolve({ id: "1" }) })).status).toBe(404);
    expect(db.listSubmissions).not.toHaveBeenCalled();
    expect(db.getSubmissionById).not.toHaveBeenCalled();
  });
  it("blocks signed-in non-admins", async () => {
    Object.assign(adminState, { signedIn: true, isAdmin: false, email: "x@gmail.com" });
    expect((await listRoute(new Request("https://boost.test/api/submissions"))).status).toBe(404);
    expect(db.listSubmissions).not.toHaveBeenCalled();
  });
  it("lets admins list all leads by default (no type or date filter)", async () => {
    Object.assign(adminState, { signedIn: true, isAdmin: true, email: "analytics@ezzey.com" });
    const response = await listRoute(new Request("https://boost.test/api/submissions"));
    expect(response.status).toBe(200);
    expect(db.listSubmissions).toHaveBeenCalledWith({});
  });
  it("rejects malformed filters", async () => {
    Object.assign(adminState, { signedIn: true, isAdmin: true, email: "analytics@ezzey.com" });
    expect((await listRoute(new Request("https://boost.test/api/submissions?fromDate=yesterday"))).status).toBe(400);
  });
});

describe("public submissions", () => {
  it("stores a verified onboarding as ready_for_fulfillment", async () => {
    const response = await onboardingRoute(post({ ...baseOnboarding, googleProfileState: "verified_accessible", googleAccessCompletion: "Yes, I completed it" }));
    expect(response.status).toBe(200);
    expect(webhook.sendWebhook).toHaveBeenCalledWith("onboarding.submitted", expect.objectContaining({ profileUrl: "https://boost.test/leads/1", formStatus: "ready_for_fulfillment" }));
    expect(db.createSubmission).toHaveBeenCalledWith(expect.objectContaining({ submissionType: "onboarding", formStatus: "ready_for_fulfillment", googleAccessStatus: "confirmed" }));
  });
  it("returns a readable message and step, never raw schema errors", async () => {
    const response = await onboardingRoute(post({ ...baseOnboarding, reportRecipients: "", googleProfileState: "not_sure", statusCheckHelp: "Yes, I need help" }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.step).toBe(6);
    expect(body.error).toMatch(/at least one person/);
    expect(JSON.stringify(body)).not.toMatch(/issues|path|"code"/);
    expect(db.createSubmission).not.toHaveBeenCalled();
  });
  it("stores support requests as support_needed", async () => {
    const response = await supportRoute(post({ firstName: "Sam", email: "sam@example.com", companyName: "Co", topic: "This onboarding form", message: "The form is stuck" }));
    expect(response.status).toBe(200);
    expect(db.createSubmission).toHaveBeenCalledWith(expect.objectContaining({ submissionType: "support", formStatus: "support_needed", googleAccessStatus: "support_needed" }));
    expect(webhook.sendWebhook).toHaveBeenCalledWith("support.submitted", expect.objectContaining({ topic: "This onboarding form" }));
  });
  it("silently drops honeypot submissions", async () => {
    const response = await supportRoute(post({ companyWebsite: "spam.example", firstName: "Bot" }));
    expect(response.status).toBe(200);
    expect(db.createSubmission).not.toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("only links http(s) URLs", () => {
    expect(safeHttpUrl("https://a.example")).toBe("https://a.example");
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("www.a.example")).toBeUndefined();
  });
  it("rate limits after the allowed number of hits", () => {
    const key = "test:1.2.3.4";
    for (let i = 0; i < 5; i++) expect(rateLimited(key, 5, 1000, 100)).toBe(false);
    expect(rateLimited(key, 5, 1000, 100)).toBe(true);
    expect(rateLimited(key, 5, 1000, 2000)).toBe(false);
  });
});

describe("deployment settings check", async () => {
  const { missingSettings } = await import("@/lib/config-check");
  it("names missing settings without exposing values", () => {
    expect(missingSettings({})).toEqual(["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "ADMIN_EMAILS", "DATABASE_URL"]);
    expect(missingSettings({ AUTH_SECRET: "s", AUTH_GOOGLE_ID: "i", AUTH_GOOGLE_SECRET: "g", ADMIN_EMAILS: "a@b.com", DATABASE_URL: "postgres://x" })).toEqual([]);
  });
});

describe("save progress and resume", () => {
  it("creates a resume link, storing only a hash of the secret token", async () => {
    const response = await saveDraftRoute(post({ email: "jane@example.com", step: 3, data: { firstName: "Jane", googleProfileState: "not_sure", evil: "x" } }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(body.resumeUrl).toBe(`https://boost.test/?resume=${body.token}`);
    const [hash, fields] = db.saveDraft.mock.calls[0] as unknown as [string, { data: Record<string, unknown>; googleAccessStatus: string }];
    expect(hash).toBe(hashToken(body.token));
    expect(hash).not.toContain(body.token);
    expect(fields.data).not.toHaveProperty("evil");
    expect(fields.googleAccessStatus).toBe("status_check_pending");
    expect(webhook.sendWebhook).not.toHaveBeenCalled();
  });
  it("notifies HighLevel only when the customer chooses Save and finish later", async () => {
    await saveDraftRoute(post({ email: "jane@example.com", step: 2, data: {}, notify: true }));
    expect(webhook.sendWebhook).toHaveBeenCalledWith("onboarding.progress_saved", expect.objectContaining({ email: "jane@example.com", resumeUrl: expect.stringContaining("/?resume=") }));
  });
  it("requires a valid email to save", async () => {
    expect((await saveDraftRoute(post({ email: "nope", step: 0, data: {} }))).status).toBe(400);
  });
  it("refuses to change a draft that was already submitted", async () => {
    db.saveDraft.mockResolvedValueOnce(null);
    expect((await saveDraftRoute(post({ token: "a".repeat(43), email: "jane@example.com", step: 2, data: {} }))).status).toBe(409);
  });
  it("loads a draft by token and rejects malformed tokens", async () => {
    const good = await loadDraftRoute(new Request(`https://boost.test/api/drafts?token=${"b".repeat(43)}`, { headers: { "x-forwarded-for": "10.9.9.9" } }));
    expect(good.status).toBe(200);
    expect(db.getDraftByTokenHash).toHaveBeenCalledWith(hashToken("b".repeat(43)));
    const bad = await loadDraftRoute(new Request("https://boost.test/api/drafts?token=short", { headers: { "x-forwarded-for": "10.9.9.9" } }));
    expect(bad.status).toBe(404);
  });
  it("marks the draft complete when the onboarding is submitted", async () => {
    await onboardingRoute(post({ ...baseOnboarding, googleProfileState: "not_sure", statusCheckHelp: "I need help", draftToken: "c".repeat(43) }));
    expect(db.completeDraft).toHaveBeenCalledWith(hashToken("c".repeat(43)), 1);
  });
  it("keeps the in-progress list admin only", async () => {
    expect((await listDraftsRoute()).status).toBe(404);
    expect(db.listOpenDrafts).not.toHaveBeenCalled();
    Object.assign(adminState, { signedIn: true, isAdmin: true, email: "analytics@ezzey.com" });
    expect((await listDraftsRoute()).status).toBe(200);
  });
});

describe("webhook routing", async () => {
  const { webhookUrlFor } = await import("@/lib/webhook-routing");
  it("sends support to its own URL and onboarding elsewhere", () => {
    const env = { HIGHLEVEL_SUPPORT_WEBHOOK_URL: "https://hl/support" };
    expect(webhookUrlFor("support.submitted", env)).toBe("https://hl/support");
    expect(webhookUrlFor("onboarding.submitted", env)).toBeNull();
    expect(webhookUrlFor("onboarding.progress_saved", { ...env, HIGHLEVEL_ONBOARDING_WEBHOOK_URL: "https://hl/onb" })).toBe("https://hl/onb");
    expect(webhookUrlFor("onboarding.submitted", { HIGHLEVEL_WEBHOOK_URL: "https://hl/all" })).toBe("https://hl/all");
  });
});

describe("client pages and Onboarding Info", () => {
  it("creates the page once the details step is done and sends Onboarding Info", async () => {
    await saveDraftRoute(post({ email: "jane@example.com", step: 3, data: { firstName: "Jane", companyName: "Smith Plumbing" } }));
    expect(db.ensureClientPage).toHaveBeenCalledWith({ email: "jane@example.com", companyName: "Smith Plumbing", draftId: 7 });
    expect(webhook.sendWebhook).toHaveBeenCalledWith("onboarding.page_created", expect.objectContaining({ email: "jane@example.com", "Onboarding Info": "https://boost.test/smith-plumbing" }));
  });
  it("does not create a page while the business name may still be half-typed", async () => {
    await saveDraftRoute(post({ email: "jane@example.com", step: 2, data: { companyName: "Smi" } }));
    expect(db.ensureClientPage).not.toHaveBeenCalled();
  });
  it("does not resend page_created for an existing page", async () => {
    db.ensureClientPage.mockResolvedValueOnce({ page: { slug: "smith-plumbing" }, created: false });
    await saveDraftRoute(post({ email: "jane@example.com", step: 5, data: { companyName: "Smith Plumbing" } }));
    expect(webhook.sendWebhook).not.toHaveBeenCalled();
  });
  it("includes Onboarding Info when saving for later", async () => {
    db.ensureClientPage.mockResolvedValueOnce({ page: { slug: "smith-plumbing" }, created: false });
    await saveDraftRoute(post({ email: "jane@example.com", step: 2, data: { companyName: "Smith Plumbing" }, notify: true }));
    expect(webhook.sendWebhook).toHaveBeenCalledWith("onboarding.progress_saved", expect.objectContaining({ "Onboarding Info": "https://boost.test/smith-plumbing" }));
  });
  it("still saves the draft if the page can't be created", async () => {
    db.ensureClientPage.mockRejectedValueOnce(new Error("table missing"));
    expect((await saveDraftRoute(post({ email: "jane@example.com", step: 4, data: { companyName: "Smith Plumbing" } }))).status).toBe(200);
  });
  it("moves the page to the submission and sends Onboarding Info on submit", async () => {
    await onboardingRoute(post({ ...baseOnboarding, googleProfileState: "not_sure", statusCheckHelp: "I need help", draftToken: "d".repeat(43) }));
    expect(db.ensureClientPage).toHaveBeenCalledWith({ email: "jane@example.com", companyName: "Smith Plumbing", draftId: 7, submissionId: 1 });
    expect(webhook.sendWebhook).toHaveBeenCalledWith("onboarding.submitted", expect.objectContaining({ email: "jane@example.com", status: "Submitted", "Onboarding Info": "https://boost.test/smith-plumbing" }));
  });
});

describe("slugs", async () => {
  const { slugify, nextFreeSlug, SLUG_PATTERN } = await import("@/lib/slug");
  it("turns business names into clean URLs", () => {
    expect(slugify("Smith & Sons Plumbing, LLC")).toBe("smith-and-sons-plumbing-llc");
    expect(slugify("  Café Olé's  ")).toBe("cafe-oles");
    expect(slugify("!!!")).toBe("client");
    expect(slugify("Support")).toBe("support-client");
    expect(slugify("Leads")).toBe("leads-client");
    expect(slugify("x".repeat(100)).length).toBeLessThanOrEqual(60);
    expect(SLUG_PATTERN.test(slugify("Smith & Sons Plumbing, LLC"))).toBe(true);
  });
  it("adds -2, -3 for duplicate names", () => {
    expect(nextFreeSlug("acme", [])).toBe("acme");
    expect(nextFreeSlug("acme", ["acme"])).toBe("acme-2");
    expect(nextFreeSlug("acme", ["acme", "acme-2", "acme-plumbing"])).toBe("acme-3");
  });
});

describe("Zapier routing", async () => {
  const { zapierUrlFor } = await import("@/lib/webhook-routing");
  it("sends onboarding events to Zapier, never support", () => {
    const env = { ZAPIER_WEBHOOK_URL: "https://hooks.zapier.com/x" };
    expect(zapierUrlFor("onboarding.page_created", env)).toBe("https://hooks.zapier.com/x");
    expect(zapierUrlFor("onboarding.submitted", env)).toBe("https://hooks.zapier.com/x");
    expect(zapierUrlFor("support.submitted", env)).toBeNull();
    expect(zapierUrlFor("onboarding.submitted", {})).toBeNull();
  });
});
