import { describe, expect, it } from "vitest";
import { ACCESS_DONE, ACCESS_HELP, ACCESS_LATER, SETUP_DONE, SETUP_HELP, SETUP_LATER, SETUP_WAITING, stepForField } from "@/lib/form";
import { getFormStatus, getGoogleAccessStatus, onboardingInput, stepIssues } from "@/lib/validation";
import { baseOnboarding } from "./fixtures";

const noProfile = { googleProfileState: "no_profile", serviceMode: "We only work online", businessPhone: "480 555 0100", businessHours: "9-5", googleAuthority: "Yes" };

function derive(extra: Record<string, unknown>) {
  const parsed = onboardingInput.safeParse({ ...baseOnboarding, ...extra });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const access = getGoogleAccessStatus(parsed.data);
  return { access, form: getFormStatus(access) };
}

describe("Google access and form status", () => {
  it("verified + connected -> confirmed, ready_for_fulfillment", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: ACCESS_DONE })).toEqual({ access: "confirmed", form: "ready_for_fulfillment" });
  });
  it("verified + later -> customer_action_pending", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: ACCESS_LATER })).toEqual({ access: "customer_action_pending", form: "customer_action_pending" });
  });
  it("verified + needs help -> support_needed", () => {
    expect(derive({ googleProfileState: "verified_accessible", googleAccessCompletion: ACCESS_HELP, googleAccessHelp: "Wrong account" }).form).toBe("support_needed");
  });
  it("no profile + later or waiting -> setup_or_verification_pending", () => {
    expect(derive({ ...noProfile, setupStatus: SETUP_LATER })).toEqual({ access: "setup_or_verification_pending", form: "customer_action_pending" });
    expect(derive({ ...noProfile, setupStatus: SETUP_WAITING }).access).toBe("setup_or_verification_pending");
  });
  it("unverified + needs help -> support_needed", () => {
    expect(derive({ googleProfileState: "unverified", setupStatus: SETUP_HELP, setupHelp: "Postcard never arrived" })).toEqual({ access: "support_needed", form: "support_needed" });
  });
  it("unverified + finished + connected -> confirmed", () => {
    expect(derive({ googleProfileState: "unverified", setupStatus: SETUP_DONE, googleAccessCompletion: ACCESS_DONE }).form).toBe("ready_for_fulfillment");
  });
  it("no access + needs help -> support_needed; handle later -> access_recovery_pending", () => {
    expect(derive({ googleProfileState: "verified_no_access", recoveryIssue: "I don't know who has access", recoveryHelp: "I need help" }).form).toBe("support_needed");
    expect(derive({ googleProfileState: "verified_no_access", recoveryIssue: "Other", recoveryIssueOther: "Old agency", recoveryHelp: "I'll handle it myself and come back later" })).toEqual({ access: "access_recovery_pending", form: "customer_action_pending" });
  });
  it("not sure + help -> support_needed; later -> status_check_pending", () => {
    expect(derive({ googleProfileState: "not_sure", statusCheckHelp: "I need help" }).form).toBe("support_needed");
    expect(derive({ googleProfileState: "not_sure", statusCheckHelp: "I'll check and come back later" }).access).toBe("status_check_pending");
  });
});

describe("required fields and conditional rules", () => {
  const issues = (extra: Record<string, unknown>) => {
    const parsed = onboardingInput.safeParse({ ...baseOnboarding, ...extra });
    return parsed.success ? [] : parsed.error.issues.map(issue => issue.path[0]);
  };
  const ok = { googleProfileState: "not_sure", statusCheckHelp: "I need help" };

  it("requires the connection answer on the verified path, and a description when help is needed", () => {
    expect(issues({ googleProfileState: "verified_accessible" })).toContain("googleAccessCompletion");
    expect(issues({ googleProfileState: "verified_accessible", googleAccessCompletion: ACCESS_HELP })).toContain("googleAccessHelp");
  });
  it("requires an address only for businesses customers visit or travel to", () => {
    expect(issues({ ...noProfile, serviceMode: "Both", setupStatus: SETUP_LATER })).toContain("businessAddress");
    expect(issues({ ...noProfile, setupStatus: SETUP_LATER })).toEqual([]);
  });
  it("requires 'Other' text whenever Other is chosen", () => {
    expect(issues({ ...ok, preferredContact: "Other" })).toContain("preferredContactOther");
    expect(issues({ ...ok, communicationPreference: "Other" })).toContain("communicationOther");
    expect(issues({ googleProfileState: "verified_no_access", recoveryIssue: "Other", recoveryHelp: "I need help" })).toContain("recoveryIssueOther");
  });
  it("requires a website address only when the business has one", () => {
    expect(issues({ ...ok, websiteStatus: "yes", website: "" })).toContain("website");
    expect(issues({ ...ok, websiteStatus: "no", website: "" })).toEqual([]);
  });
  it("makes previously optional business questions required", () => {
    for (const field of ["businessRole", "differentiator", "exclusions", "competitors", "optionalKeywords", "formDestination", "leadChallenges", "holdingBack"]) {
      expect(issues({ ...ok, [field]: "" })).toContain(field);
    }
  });
  it("keeps the optional exceptions optional", () => {
    expect(issues({ ...ok, notes: "" })).toEqual([]);
    expect(issues({ googleProfileState: "verified_no_access", recoveryIssue: "I don't know who has access", recoveryHelp: "I need help", recoveryContactName: "", recoveryContactEmail: "" })).toEqual([]);
  });
  it("requires mobile number and consent for text updates", () => {
    expect(issues({ ...ok, communicationPreference: "Text message" })).toEqual(expect.arrayContaining(["mobileNumber", "smsConsent"]));
  });
  it("validates one step at a time", () => {
    expect(stepIssues({ googleProfileState: "verified_accessible" }, 0)).toEqual([]);
    expect(stepIssues({ googleProfileState: "verified_accessible" }, 1).map(issue => issue.path[0])).toEqual(["googleAccessCompletion"]);
    expect(stepIssues({}, 2).map(issue => issue.path[0])).toEqual(expect.arrayContaining(["firstName", "email", "companyName", "businessCity", "businessState"]));
  });
  it("starts with the Google question and maps fields to steps", () => {
    expect(stepForField("googleProfileState")).toBe(0);
    expect(stepForField("googleAccessCompletion")).toBe(1);
    expect(stepForField("email")).toBe(2);
    expect(stepForField("holdingBack")).toBe(3);
    expect(stepForField("reportRecipients")).toBe(6);
  });
});
