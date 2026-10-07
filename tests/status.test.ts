import { describe, expect, it } from "vitest";
import { getFormStatus, getGoogleAccessStatus, onboardingInput } from "@/lib/validation";
import { baseOnboarding } from "./fixtures";

function derive(extra: Record<string, unknown>) {
  const parsed = onboardingInput.safeParse({ ...baseOnboarding, ...extra });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const access = getGoogleAccessStatus(parsed.data);
  return { access, form: getFormStatus(access) };
}

describe("Google access and form status (handoff acceptance tests)", () => {
  it("verified + secure access complete -> confirmed, ready_for_fulfillment", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: "Yes, I completed it" })).toEqual({ access: "confirmed", form: "ready_for_fulfillment" });
  });
  it("verified + access deferred -> customer_action_pending", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: "I will complete it later" })).toEqual({ access: "customer_action_pending", form: "customer_action_pending" });
  });
  it("verified + could not complete -> support_needed", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: "I could not complete it", googleAccessBlocker: "Wrong account" }).form).toBe("support_needed");
  });
  it("no profile + setup pending -> setup_or_verification_pending, customer_action_pending", () => {
    expect(derive({ googleProfileState: "no_profile", serviceMode: "My business operates online only", businessPhone: "480 555 0100", businessHours: "9-5", googleAuthority: "Yes", setupStatus: "I will set up or verify the profile now" })).toEqual({ access: "setup_or_verification_pending", form: "customer_action_pending" });
  });
  it("unverified + needs help -> support_needed", () => {
    expect(derive({ googleProfileState: "unverified", setupStatus: "I need help", setupHelp: "Postcard never arrived" })).toEqual({ access: "support_needed", form: "support_needed" });
  });
  it("unverified + setup complete + access complete -> confirmed", () => {
    expect(derive({ googleProfileState: "unverified", setupStatus: "I have completed setup and verification", googleAccessCompletion: "Yes, I completed it" }).form).toBe("ready_for_fulfillment");
  });
  it("verified without access + needs help -> support_needed", () => {
    expect(derive({ googleProfileState: "verified_no_access", recoveryIssue: "I do not know who has access", recoveryHelp: "Yes, I need help" }).form).toBe("support_needed");
  });
  it("verified without access + will handle -> access_recovery_pending", () => {
    expect(derive({ googleProfileState: "verified_no_access", recoveryIssue: "Other", recoveryHelp: "No, I will handle it and return later" })).toEqual({ access: "access_recovery_pending", form: "customer_action_pending" });
  });
  it("not sure + requests help -> support_needed", () => {
    expect(derive({ googleProfileState: "not_sure", statusCheckHelp: "Yes, I need help" }).form).toBe("support_needed");
  });
  it("not sure + will check -> status_check_pending", () => {
    expect(derive({ googleProfileState: "not_sure", statusCheckHelp: "No, I will check and return later" }).access).toBe("status_check_pending");
  });
});

describe("conditional validation", () => {
  const issues = (extra: Record<string, unknown>) => {
    const parsed = onboardingInput.safeParse({ ...baseOnboarding, ...extra });
    return parsed.success ? [] : parsed.error.issues.map(issue => issue.path[0]);
  };
  it("requires the secure-access answer on the verified path", () => {
    expect(issues({ googleProfileState: "verified_accessible" })).toContain("googleAccessCompletion");
  });
  it("requires an address for physical or service-area businesses without a profile", () => {
    expect(issues({ googleProfileState: "no_profile", serviceMode: "Both", businessPhone: "1", businessHours: "9-5", googleAuthority: "Yes", setupStatus: "I will set up or verify the profile now" })).toContain("businessAddress");
  });
  it("does not require an address for online-only businesses", () => {
    expect(issues({ googleProfileState: "no_profile", serviceMode: "My business operates online only", businessPhone: "1", businessHours: "9-5", googleAuthority: "Yes", setupStatus: "I will set up or verify the profile now" })).toEqual([]);
  });
  it("requires mobile number and consent for text updates", () => {
    const missing = issues({ googleProfileState: "not_sure", statusCheckHelp: "Yes, I need help", communicationPreference: "Text message" });
    expect(missing).toEqual(expect.arrayContaining(["mobileNumber", "smsConsent"]));
  });
  it("rejects an unknown Google profile state", () => {
    expect(issues({ googleProfileState: "hacked" })).toContain("googleProfileState");
  });
});
