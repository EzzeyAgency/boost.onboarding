// Shared definitions for the onboarding form: options, steps, and which fields belong to each step.
// Used by the browser (to validate one step at a time) and the server (to send customers back to the right step).

export const googleProfileOptions = [
  ["verified_accessible", "I have a verified Google Business Profile and I can log in to it"],
  ["verified_no_access", "I have a verified Google Business Profile, but I can't log in to it"],
  ["unverified", "I have a Google Business Profile, but it isn't verified yet"],
  ["no_profile", "I don't have a Google Business Profile"],
  ["not_sure", "I'm not sure"],
] as const;

export type GoogleProfileState = (typeof googleProfileOptions)[number][0];

export const ACCESS_DONE = "Yes, I completed it";
export const ACCESS_HELP = "I need help";
export const ACCESS_LATER = "I'll do it later";
export const accessOptions = [ACCESS_DONE, ACCESS_HELP, ACCESS_LATER] as const;

export const SETUP_DONE = "I finished setting up and verifying my profile";
export const SETUP_WAITING = "I started, and I'm waiting for Google to verify it";
export const SETUP_LATER = "I'll do it now or later";
export const SETUP_HELP = "I need help";
export const setupOptions = [SETUP_DONE, SETUP_WAITING, SETUP_LATER, SETUP_HELP] as const;

export const serviceModeOptions = [
  "Customers come to my business location",
  "We travel to our customers",
  "Both",
  "We only work online",
  "Other or not sure",
] as const;
export const ADDRESS_SERVICE_MODES: readonly string[] = serviceModeOptions.slice(0, 3);

export const authorityOptions = ["Yes", "No", "I'm not sure"] as const;

export const RECOVERY_OTHER = "Other";
export const recoveryIssueOptions = [
  "A former employee or agency may have access",
  "Another owner or employee may have access",
  "I don't know who has access",
  "I tried to get access back and need help",
  RECOVERY_OTHER,
] as const;

export const HELP_YES = "I need help";
export const recoveryHelpOptions = [HELP_YES, "I'll handle it myself and come back later"] as const;
export const statusCheckOptions = [HELP_YES, "I'll check and come back later"] as const;

export const websiteStatusOptions = [
  ["yes", "Yes"],
  ["unsure", "Yes, but I'm not sure of the address"],
  ["no", "No, my business doesn't have a website"],
] as const;

export const CONTACT_OTHER = "Other";
export const preferredContactOptions = [
  "Phone calls",
  "Website or contact-form requests",
  "Appointments or bookings",
  "In-person visits",
  CONTACT_OTHER,
] as const;

export const callTrackingOptions = ["Yes, and I know which company provides it", "Yes, but I don't know the provider", "No", "I'm not sure"] as const;

export const outcomesTrackingOptions = [
  "We track it in a CRM or software",
  "We track it by hand (spreadsheet, notebook)",
  "We know roughly, but we don't write it down",
  "We don't track it",
  "I'm not sure",
] as const;

export const COMM_OTHER = "Other";
export const COMM_TEXT = "Text message";
export const communicationOptions = ["Email", COMM_TEXT, "Phone call", COMM_OTHER] as const;

export const usStates = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"], ["PR", "Puerto Rico"], ["OUT", "Outside the US"],
] as const;

export const supportTopics = [
  "Google Business Profile setup",
  "Google Business Profile verification",
  "Getting into my Google Business Profile",
  "Secure Google connection (Leadsie)",
  "This onboarding form",
  "Website or business information",
  "Other",
] as const;

export const steps = [
  { id: "google", part: 1, label: "Your Google profile" },
  { id: "connect", part: 1, label: "Connect Google" },
  { id: "contact", part: 1, label: "Your details" },
  { id: "business", part: 2, label: "Your business" },
  { id: "goals", part: 2, label: "Your goals" },
  { id: "leads", part: 2, label: "Leads and follow-up" },
  { id: "updates", part: 2, label: "Updates" },
  { id: "review", part: 2, label: "Review and submit" },
] as const;

export const REVIEW_STEP = steps.length - 1;

export const STEP_FIELDS: Record<number, readonly string[]> = {
  0: ["googleProfileState"],
  1: ["googleAccessCompletion", "googleAccessHelp", "serviceMode", "businessAddress", "businessPhone", "businessHours", "googleAuthority", "setupStatus", "setupHelp", "recoveryContactName", "recoveryContactEmail", "recoveryIssue", "recoveryIssueOther", "recoveryHelp", "statusCheckHelp"],
  2: ["firstName", "lastName", "email", "companyName", "businessRole", "businessCity", "businessState"],
  3: ["websiteStatus", "website", "businessDescription", "growthFocus", "growthAreas", "preferredContact", "preferredContactOther", "holdingBack", "differentiator", "exclusions"],
  4: ["success90", "successYear", "highValueWork", "competitors", "optionalKeywords"],
  5: ["responseOwner", "callTracking", "outcomesTracking", "formDestination", "leadChallenges"],
  6: ["reportRecipients", "communicationPreference", "communicationOther", "mobileNumber", "smsConsent", "notes"],
};

export const FORM_FIELDS: readonly string[] = Object.values(STEP_FIELDS).flat();

/** Which step (0-6) a field belongs to, so the customer can be sent back to it. */
export function stepForField(field: string | undefined) {
  for (const [step, fields] of Object.entries(STEP_FIELDS)) if (field && fields.includes(field)) return Number(step);
  return 0;
}

export function googleProfileLabel(value: unknown) {
  return googleProfileOptions.find(([key]) => key === value)?.[1] ?? (typeof value === "string" ? value : "");
}
