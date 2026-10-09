import { z } from "zod";
import {
  ACCESS_DONE,
  ACCESS_HELP,
  ACCESS_LATER,
  ADDRESS_SERVICE_MODES,
  COMM_OTHER,
  COMM_TEXT,
  CONTACT_OTHER,
  FORM_FIELDS,
  HELP_YES,
  RECOVERY_OTHER,
  SETUP_DONE,
  SETUP_HELP,
  googleProfileOptions,
  usStates,
  stepForField,
  supportTopics,
} from "@/lib/form";

export { supportTopics };

const googleProfileKeys = googleProfileOptions.map(([key]) => key) as [string, ...string[]];
const optionalText = (max: number) => z.string().trim().max(max).optional();
const requiredText = (max: number, message: string, min = 1) => z.string({ error: message }).trim().min(min, message).max(max);

const onboardingBase = z.object({
    // Part 1: Google Business Profile (conditional fields are checked below)
    googleProfileState: z.enum(googleProfileKeys, { error: "Please choose the statement that best describes your Google Business Profile." }),
    googleAccessCompletion: optionalText(120),
    googleAccessHelp: optionalText(6000),
    serviceMode: optionalText(160),
    businessAddress: optionalText(2000),
    businessPhone: optionalText(120),
    businessHours: optionalText(1000),
    googleAuthority: optionalText(120),
    setupStatus: optionalText(160),
    setupHelp: optionalText(6000),
    recoveryContactName: optionalText(160),
    recoveryContactEmail: z.string().trim().email("Please enter a valid email for the person who manages the profile, or leave it blank.").max(320).or(z.literal("")).optional(),
    recoveryIssue: optionalText(160),
    recoveryIssueOther: optionalText(3000),
    recoveryHelp: optionalText(120),
    statusCheckHelp: optionalText(120),

    // Part 1: Contact details
    firstName: requiredText(120, "Please enter your first name."),
    lastName: requiredText(120, "Please enter your last name."),
    email: z.string({ error: "Please enter a valid email address." }).trim().email("Please enter a valid email address.").max(320),
    companyName: requiredText(255, "Please enter your business name."),
    businessRole: requiredText(160, "Please tell us your role in the business."),
    businessCity: requiredText(120, "Please enter the city your business is based in."),
    businessState: z.enum(usStates.map(([code]) => code) as [string, ...string[]], { error: "Please choose the state your business is based in." }),

    // Part 2: Your business
    websiteStatus: z.enum(["yes", "unsure", "no"], { error: "Please tell us whether your business has a website." }),
    website: optionalText(2048),
    businessDescription: requiredText(6000, "Please tell us what your business does.", 5),
    growthFocus: requiredText(3000, "Please tell us which services, products, or customers you want more of."),
    growthAreas: requiredText(3000, "Please tell us where you want to find more customers."),
    preferredContact: requiredText(120, "Please choose how you'd like new customers to reach you."),
    preferredContactOther: optionalText(1000),
    holdingBack: requiredText(6000, "Please tell us what you feel is holding your business back."),
    differentiator: requiredText(6000, "Please tell us what makes your business different."),
    exclusions: requiredText(3000, "Please tell us what you don't want more of, or write \"None\"."),

    // Part 2: Customers and competitors
    highValueWork: requiredText(6000, "Please tell us which customers or jobs are most valuable to you."),
    competitors: requiredText(6000, "Please list a few competitors, or write \"Not sure\"."),
    optionalKeywords: requiredText(6000, "Please share the words customers use to find you, or write \"Not sure\"."),

    // Part 2: Leads and follow-up
    responseOwner: requiredText(3000, "Please tell us who answers new calls and messages."),
    callTracking: requiredText(160, "Please choose an answer about call tracking."),
    outcomesTracking: requiredText(200, "Please choose how you keep track of new customers."),
    formDestination: requiredText(3000, "Please tell us where website messages go, or write \"Not sure\"."),
    leadChallenges: requiredText(6000, "Please tell us about any problems with calls or follow-up, or write \"None\"."),

    // Part 2: Updates
    reportRecipients: requiredText(3000, "Please add at least one person who should receive BOOST updates.", 3),
    communicationPreference: requiredText(120, "Please choose how you'd like to receive updates."),
    communicationOther: optionalText(1000),
    mobileNumber: optionalText(120),
    smsConsent: z.boolean().optional(),
    notes: optionalText(6000),
  });

type Issue = { path: string[]; message: string };

/** Rules that depend on other answers. Runs on partial answers too, so each step can be checked on its own. */
function conditionalIssues(raw: Record<string, unknown>): Issue[] {
  const input = raw as Record<string, string | boolean | undefined>;
  const issues: Issue[] = [];
  const has = (field: string) => String(input[field] ?? "").trim() !== "";
  const requireField = (field: string, message: string) => { if (!has(field)) issues.push({ path: [field], message }); };
  const requireAccessDecision = () => {
    requireField("googleAccessCompletion", "Please tell us whether you finished the secure Google connection.");
    if (input.googleAccessCompletion === ACCESS_HELP) requireField("googleAccessHelp", "Please tell us what got in the way so we can help.");
  };
  const requireSetupDecision = () => {
    requireField("setupStatus", "Please tell us where you are with your Google Business Profile.");
    if (input.setupStatus === SETUP_HELP) requireField("setupHelp", "Please tell us what you need help with.");
    if (input.setupStatus === SETUP_DONE) requireAccessDecision();
  };

  switch (input.googleProfileState) {
    case "verified_accessible":
      requireAccessDecision();
      break;
    case "unverified":
      requireSetupDecision();
      break;
    case "no_profile":
      requireField("serviceMode", "Please tell us how you serve customers.");
      if (ADDRESS_SERVICE_MODES.includes(String(input.serviceMode ?? ""))) requireField("businessAddress", "Please enter your business address. Google needs it to verify your profile.");
      requireField("businessPhone", "Please enter the phone number customers should call.");
      requireField("businessHours", "Please enter your business hours.");
      requireField("googleAuthority", "Please tell us whether you're allowed to manage the profile.");
      requireSetupDecision();
      break;
    case "verified_no_access":
      requireField("recoveryIssue", "Please choose what best describes the problem.");
      if (input.recoveryIssue === RECOVERY_OTHER) requireField("recoveryIssueOther", "Please describe the problem in a few words.");
      requireField("recoveryHelp", "Please tell us whether you'd like our help.");
      break;
    case "not_sure":
      requireField("statusCheckHelp", "Please tell us whether you'd like our help checking.");
      break;
  }

  if (input.websiteStatus === "yes") requireField("website", "Please enter your website address.");
  if (input.preferredContact === CONTACT_OTHER) requireField("preferredContactOther", "Please tell us how you'd like customers to reach you.");
  if (input.communicationPreference === COMM_OTHER) requireField("communicationOther", "Please tell us how you'd like to receive updates.");
  if (input.communicationPreference === COMM_TEXT) {
    requireField("mobileNumber", "Please enter a mobile number for text updates, or choose another option.");
    if (!input.smsConsent) issues.push({ path: ["smsConsent"], message: "Please agree to receive text updates, or choose another option." });
  }
  return issues;
}

export const onboardingInput = onboardingBase.superRefine((input, ctx) => {
  for (const issue of conditionalIssues(input)) ctx.addIssue({ code: "custom", ...issue });
});

export type OnboardingInput = z.infer<typeof onboardingInput>;

export const supportInput = z.object({
  firstName: requiredText(120, "Please enter your first name."),
  lastName: optionalText(120),
  email: z.string({ error: "Please enter a valid email address." }).trim().email("Please enter a valid email address.").max(320),
  phone: optionalText(60),
  companyName: requiredText(255, "Please enter your business name."),
  topic: z.enum(supportTopics, { error: "Please choose what you need help with." }),
  message: requiredText(8000, "Please tell us a little about what's going on.", 5),
  tried: optionalText(4000),
  fromOnboarding: z.boolean().optional(),
});

export type SupportInput = z.infer<typeof supportInput>;

export type GoogleAccessStatus =
  | "confirmed"
  | "customer_action_pending"
  | "support_needed"
  | "setup_or_verification_pending"
  | "access_recovery_pending"
  | "status_check_pending";

function accessDecisionStatus(completion: string | undefined): GoogleAccessStatus {
  if (completion === ACCESS_DONE) return "confirmed";
  if (completion === ACCESS_LATER) return "customer_action_pending";
  return "support_needed";
}

export function getGoogleAccessStatus(input: Pick<OnboardingInput, "googleProfileState" | "googleAccessCompletion" | "setupStatus" | "recoveryHelp" | "statusCheckHelp">): GoogleAccessStatus {
  switch (input.googleProfileState) {
    case "verified_accessible":
      return accessDecisionStatus(input.googleAccessCompletion);
    case "unverified":
    case "no_profile":
      if (input.setupStatus === SETUP_DONE) return accessDecisionStatus(input.googleAccessCompletion);
      if (input.setupStatus === SETUP_HELP) return "support_needed";
      return "setup_or_verification_pending";
    case "verified_no_access":
      return input.recoveryHelp === HELP_YES ? "support_needed" : "access_recovery_pending";
    default:
      return input.statusCheckHelp === HELP_YES ? "support_needed" : "status_check_pending";
  }
}

export function getFormStatus(accessStatus: GoogleAccessStatus) {
  if (accessStatus === "confirmed") return "ready_for_fulfillment" as const;
  if (accessStatus === "support_needed") return "support_needed" as const;
  return "customer_action_pending" as const;
}

/** Problems for a single step only, so the customer can move forward one step at a time. */
export function stepIssues(form: Record<string, unknown>, step: number): { path: PropertyKey[]; message: string }[] {
  const base = onboardingBase.safeParse(form);
  const all = [...(base.success ? [] : base.error.issues), ...conditionalIssues(form)];
  return all.filter(issue => stepForField(String(issue.path[0])) === step && FORM_FIELDS.includes(String(issue.path[0])));
}

/** A single human-readable message for the first validation problem. Never exposes raw schema output. */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  const custom = issue?.message && !/^(Invalid|Too|Expected)/.test(issue.message);
  return { field, step: stepForField(field), message: custom ? issue.message : "Please review this step and complete the required fields." };
}

/** Draft answers: only known fields, plain strings or booleans, size-limited. */
export const draftData = z
  .record(z.string(), z.union([z.string().max(8000), z.boolean()]))
  .transform(data => Object.fromEntries(Object.entries(data).filter(([key]) => FORM_FIELDS.includes(key))));

export const draftInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/).optional(),
  email: z.string().trim().email("Please enter a valid email address so we can save your progress.").max(320),
  step: z.number().int().min(0).max(20),
  data: draftData,
  notify: z.boolean().optional(),
});
