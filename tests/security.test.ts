import { beforeEach, describe, expect, it, vi } from "vitest";
import { isAdminEmail } from "@/lib/admin";
import { safeHttpUrl } from "@/lib/links";
import { rateLimited } from "@/lib/rate-limit";
import { baseOnboarding } from "./fixtures";

const adminState = { signedIn: false, isAdmin: false, email: null as string | null };
const db = { createSubmission: vi.fn(async () => 1), listSubmissions: vi.fn(async () => [{ id: 1 }]), getSubmissionById: vi.fn(async () => ({ id: 1 })) };

vi.mock("@/auth", () => ({ getAdmin: async () => adminState }));
vi.mock("@/lib/db", () => db);

const { GET: listRoute } = await import("@/app/api/submissions/route");
const { GET: detailRoute } = await import("@/app/api/submissions/[id]/route");
const { POST: onboardingRoute } = await import("@/app/api/onboarding/route");
const { POST: supportRoute } = await import("@/app/api/support/route");

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
    expect(db.createSubmission).toHaveBeenCalledWith(expect.objectContaining({ submissionType: "onboarding", formStatus: "ready_for_fulfillment", googleAccessStatus: "confirmed" }));
  });
  it("returns a readable message and step, never raw schema errors", async () => {
    const response = await onboardingRoute(post({ ...baseOnboarding, reportRecipients: "", googleProfileState: "not_sure", statusCheckHelp: "Yes, I need help" }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.step).toBe(4);
    expect(body.error).toMatch(/reporting recipient/);
    expect(JSON.stringify(body)).not.toMatch(/issues|path|"code"/);
    expect(db.createSubmission).not.toHaveBeenCalled();
  });
  it("stores support requests as support_needed", async () => {
    const response = await supportRoute(post({ firstName: "Sam", email: "sam@example.com", companyName: "Co", topic: "Onboarding form", message: "The form is stuck" }));
    expect(response.status).toBe(200);
    expect(db.createSubmission).toHaveBeenCalledWith(expect.objectContaining({ submissionType: "support", formStatus: "support_needed", googleAccessStatus: "support_needed" }));
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
