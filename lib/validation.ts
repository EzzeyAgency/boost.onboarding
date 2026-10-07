import { z } from "zod";

export const outcomeOptions = [
  "More qualified calls",
  "More quote or contact requests",
  "More appointments or bookings",
  "More website visitors",
  "Stronger visibility and reputation",
  "More accurate business information online",
  "Other",
] as const;

export const googleProfileOptions = ["verified_accessible", "verified_no_access", "unverified", "no_profile", "not_sure"] as const;

export const supportTopics = [
  "Google Business Profile setup",
  "Google Business Profile verification",
  "Google Business Profile account access",
  "Secure Google access link",
  "Onboarding form",
  "Website or business information",
  "Other",
] as const;

export const ADDRESS_SERVICE_MODES = ["Customers come to my physical business location", "My business travels to customers", "Both"];
export const ACCESS_BLOCKED = ["I need help", "I could not complete it"];
export const SETUP_COMPLETE = "I have completed setup and verification";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const onboardingInput = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(120),
    lastName: z.string().trim().min(1, "Last name is required.").max(120),
    email: z.string().trim().email("Enter a valid email address.").max(320),
    companyName: z.string().trim().min(1, "Business name is required.").max(255),
    businessRole: optionalText(160),
    website: z.string().trim().min(1, "Please enter your website address or choose another website status.").max(2048),
    businessDescription: z.string().trim().min(10, "Please describe what your business does in a little more detail.").max(6000),
    growthFocus: z.string().trim().min(3, "Please tell us what you most want to grow.").max(3000),
    growthAreas: z.string().trim().min(2, "Please tell us the areas you want to grow in.").max(3000),
    primaryOutcome: z.enum(outcomeOptions, { error: "Please choose the most important outcome." }),
    differentiator: optionalText(6000),
    exclusions: optionalText(3000),
    googleProfileState: z.enum(googleProfileOptions, { error: "Please choose the statement that best describes your Google Business Profile." }),
    googleAccessCompletion: optionalText(120),
    googleAccessBlocker: optionalText(6000),
    serviceMode: optionalText(160),
    businessAddress: optionalText(2000),
    businessPhone: optionalText(120),
    businessHours: optionalText(1000),
    googleAuthority: optionalText(120),
    setupStatus: optionalText(160),
    setupHelp: optionalText(6000),
    recoveryContactName: optionalText(160),
    recoveryContactEmail: z.string().trim().email("Enter a valid email address for the profile manager, or leave it blank.").max(320).or(z.literal("")).optional(),
    recoveryIssue: optionalText(160),
    recoveryHelp: optionalText(120),
    statusCheckHelp: optionalText(120),
    success90: z.string().trim().min(3, "Please share your 90-day goal.").max(6000),
    successYear: optionalText(6000),
    highValueWork: z.string().trim().min(3, "Please describe your most valuable customers or work.").max(6000),
    competitors: optionalText(6000),
    optionalKeywords: optionalText(6000),
    primaryConversion: z.string().trim().min(1, "Please choose the most valuable customer action.").max(120),
    responseOwner: z.string().trim().min(2, "Please tell us who responds to new inquiries.").max(3000),
    callTracking: z.string().trim().min(1, "Please choose your call-tracking status.").max(160),
    outcomesTracking: z.string().trim().min(1, "Please choose how outcomes are tracked.").max(200),
    formDestination: optionalText(3000),
    leadChallenges: optionalText(6000),
    reportRecipients: z.string().trim().min(3, "Please add the name, email address, or role of at least one reporting recipient.").max(3000),
    communicationPreference: z.string().trim().min(1, "Please choose how you would like to receive important BOOST updates.").max(120),
    mobileNumber: optionalText(120),
    smsConsent: z.boolean().optional(),
    notes: optionalText(6000),
  })
  .superRefine((input, ctx) => {
    const values = input as Record<string, unknown>;
    const requireField = (field: string, message: string) => {
      if (!String(values[field] ?? "").trim()) ctx.addIssue({ code: "custom", path: [field], message });
    };
    const requireAccessDecision = () => {
      requireField("googleAccessCompletion", "Please tell us the status of the secure access step.");
      if (ACCESS_BLOCKED.includes(input.googleAccessCompletion ?? "")) requireField("googleAccessBlocker", "Please describe what prevented the access step.");
    };
    const requireSetupDecision = () => {
      requireField("setupStatus", "Please tell us where you are in the setup and verification process.");
      if (input.setupStatus === "I need help") requireField("setupHelp", "Please tell us what support you need.");
      if (input.setupStatus === SETUP_COMPLETE) requireAccessDecision();
    };

    switch (input.googleProfileState) {
      case "verified_accessible":
        requireAccessDecision();
        break;
      case "unverified":
        requireSetupDecision();
        break;
      case "no_profile":
        requireField("serviceMode", "Please choose how your business serves customers.");
        requireField("businessPhone", "Please provide the customer-facing business phone number.");
        requireField("businessHours", "Please provide your customer-facing business hours.");
        requireField("googleAuthority", "Please confirm whether you can manage the Google Business Profile.");
        if (ADDRESS_SERVICE_MODES.includes(input.serviceMode ?? "")) requireField("businessAddress", "Please provide the physical address needed for setup and verification.");
        requireSetupDecision();
        break;
      case "verified_no_access":
        requireField("recoveryIssue", "Please describe the Google Business Profile access issue.");
        requireField("recoveryHelp", "Please tell us whether you would like help recovering access.");
        break;
      case "not_sure":
        requireField("statusCheckHelp", "Please choose how you would like to handle the profile-status check.");
        break;
    }

    if (input.communicationPreference === "Text message") {
      requireField("mobileNumber", "Please provide a mobile number for text updates, or choose another update method.");
      if (!input.smsConsent) ctx.addIssue({ code: "custom", path: ["smsConsent"], message: "Please agree to receive text updates, or choose another update method." });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingInput>;

export const supportInput = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(120),
  lastName: optionalText(120),
  email: z.string().trim().email("Enter a valid email address.").max(320),
  companyName: z.string().trim().min(1, "Company name is required.").max(255),
  topic: z.enum(supportTopics, { error: "Please choose the area that best describes the issue." }),
  message: z.string().trim().min(5, "Please describe what you need help with.").max(8000),
});

export type SupportInput = z.infer<typeof supportInput>;

export type GoogleAccessStatus =
  | "confirmed"
  | "customer_action_pending"
  | "support_needed"
  | "setup_or_verification_pending"
  | "access_recovery_pending"
  | "status_check_pending";

function accessDecisionStatus(completion: string | undefined, deferredStatus: GoogleAccessStatus): GoogleAccessStatus {
  if (completion === "Yes, I completed it") return "confirmed";
  if (completion === "I will complete it later") return deferredStatus;
  return "support_needed";
}

export function getGoogleAccessStatus(input: OnboardingInput): GoogleAccessStatus {
  switch (input.googleProfileState) {
    case "verified_accessible":
      return accessDecisionStatus(input.googleAccessCompletion, "customer_action_pending");
    case "unverified":
    case "no_profile":
      if (input.setupStatus === SETUP_COMPLETE) return accessDecisionStatus(input.googleAccessCompletion, "customer_action_pending");
      if (input.setupStatus === "I need help") return "support_needed";
      return "setup_or_verification_pending";
    case "verified_no_access":
      return input.recoveryHelp === "Yes, I need help" ? "support_needed" : "access_recovery_pending";
    case "not_sure":
      return input.statusCheckHelp === "Yes, I need help" ? "support_needed" : "status_check_pending";
  }
}

export function getFormStatus(accessStatus: GoogleAccessStatus) {
  if (accessStatus === "confirmed") return "ready_for_fulfillment" as const;
  if (accessStatus === "support_needed") return "support_needed" as const;
  return "customer_action_pending" as const;
}

const STEP_FIELDS: Record<number, string[]> = {
  0: ["firstName", "lastName", "email", "companyName", "businessRole", "website", "businessDescription", "growthFocus", "growthAreas", "primaryOutcome", "differentiator", "exclusions"],
  1: ["googleProfileState", "googleAccessCompletion", "googleAccessBlocker", "serviceMode", "businessAddress", "businessPhone", "businessHours", "googleAuthority", "setupStatus", "setupHelp", "recoveryContactName", "recoveryContactEmail", "recoveryIssue", "recoveryHelp", "statusCheckHelp"],
  2: ["success90", "successYear", "highValueWork", "competitors", "optionalKeywords"],
  3: ["primaryConversion", "responseOwner", "callTracking", "outcomesTracking", "formDestination", "leadChallenges"],
  4: ["reportRecipients", "communicationPreference", "mobileNumber", "smsConsent", "notes"],
};

/** Which onboarding step (0-4) a field belongs to, so the customer can be sent back to it. */
export function stepForField(field: string | undefined) {
  for (const [step, fields] of Object.entries(STEP_FIELDS)) if (field && fields.includes(field)) return Number(step);
  return 0;
}

/** A single human-readable message for the first validation problem. Never exposes raw schema output. */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  const custom = issue?.message && !/^(Invalid|Too|Expected)/.test(issue.message);
  return { field, step: stepForField(field), message: custom ? issue.message : "Please review the highlighted step and complete the required fields." };
}
