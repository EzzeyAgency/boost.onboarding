import { Globe2 } from "lucide-react";
import { googleProfileLabel } from "@/lib/form";
import { safeHttpUrl } from "@/lib/links";

type Answers = Record<string, unknown>;
type DetailItem = { label: string; value: unknown; href?: string };

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^[a-z]+(_[a-z]+)+$/.test(value)) return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
  return String(value);
}

function item(label: string, value: unknown, link = false): DetailItem {
  return { label, value, href: link ? safeHttpUrl(value) : undefined };
}

/** "Other" answers show the customer's own words. */
function withOther(choice: unknown, other: unknown) {
  return hasValue(other) ? `${String(choice)}: ${String(other)}` : choice;
}

const websiteLabels: Record<string, string> = { unsure: "Has a website, but not sure of the address", no: "No website" };

function DetailSection({ title, caption, items }: { title: string; caption: string; items: DetailItem[] }) {
  const visible = items.filter(entry => hasValue(entry.value));
  if (!visible.length) return null;

  return <section className="business-section">
    <div className="business-section-heading"><h2>{title}</h2><p>{caption}</p></div>
    <div className="business-answer-grid">
      {visible.map(entry => <div className="business-answer" key={entry.label}>
        <span>{entry.label}</span>
        {entry.href ? <a href={entry.href} target="_blank" rel="noreferrer">{displayValue(entry.value)} <Globe2 size={14} /></a> : <p>{displayValue(entry.value)}</p>}
      </div>)}
    </div>
  </section>;
}

export function SupportProfile({ answers, topic, message, contact }: { answers: Answers; topic: string | null; message: string | null; contact: { companyName: string; name: string; email: string } }) {
  return <>
    <DetailSection title="Support request" caption="The customer's request and the category used for routing." items={[
      item("Request category", topic ?? answers.topic),
      item("What's going on", message ?? answers.message),
      item("Already tried", answers.tried),
      item("Sent from the onboarding form", answers.fromOnboarding),
    ]} />
    <DetailSection title="Business contact" caption="Use these details to continue the support conversation." items={[
      item("Business name", contact.companyName),
      item("Contact name", contact.name),
      item("Email", contact.email),
      item("Phone", answers.phone),
    ]} />
  </>;
}

/** Every onboarding answer, grouped for a call. Includes field names from earlier form versions so older records still display. */
export function OnboardingProfile({ answers, googleAccessStatus }: { answers: Answers; googleAccessStatus?: string | null }) {
  const website = answers.websiteStatus && answers.websiteStatus !== "yes" ? websiteLabels[String(answers.websiteStatus)] : answers.website;
  return <>
    <DetailSection title="Business overview" caption="A quick profile to anchor the conversation." items={[
      item("What the business does", answers.businessDescription),
      item("Contact's role", answers.businessRole),
      item("Based in", [answers.businessCity, answers.businessState === "OUT" ? "Outside the US" : answers.businessState].filter(Boolean).join(", ")),
      item("Website", website, true),
      item("What's holding the business back", answers.holdingBack),
      item("What makes it different", answers.differentiator),
      item("Doesn't want more of", answers.exclusions),
    ]} />
    <DetailSection title="Growth goals" caption="What this business wants more of, and what success looks like." items={[
      item("Preferred way for new customers to reach out", withOther(answers.preferredContact, answers.preferredContactOther)),
      item("Primary outcome (earlier form)", answers.primaryOutcome),
      item("Wants more of", answers.growthFocus),
      item("Where they want more customers", answers.growthAreas),
      item("Great first 90 days (earlier form)", answers.success90),
      item("Great first year (earlier form)", answers.successYear),
      item("Most valuable customers or jobs", answers.highValueWork),
    ]} />
    <DetailSection title="Google Business Profile" caption="Read this before discussing visibility, reviews, or the next Google step." items={[
      item("Profile status", googleProfileLabel(answers.googleProfileState)),
      item("Google access status", googleAccessStatus),
      item("Secure Google connection", answers.googleAccessCompletion),
      item("What got in the way", answers.googleAccessHelp ?? answers.googleAccessBlocker),
      item("Setup or verification status", answers.setupStatus),
      item("Setup help needed", answers.setupHelp),
      item("Access problem", withOther(answers.recoveryIssue, answers.recoveryIssueOther)),
      item("Who may have access", answers.recoveryContactName),
      item("Their email", answers.recoveryContactEmail),
      item("Wants help recovering access", answers.recoveryHelp),
      item("Wants help checking status", answers.statusCheckHelp),
      item("Allowed to manage profile", answers.googleAuthority),
      item("How they serve customers", answers.serviceMode),
      item("Business address", answers.businessAddress),
      item("Business phone", answers.businessPhone),
      item("Business hours", answers.businessHours),
    ]} />
    <DetailSection title="Leads and follow-up" caption="How new customers reach them today and how results are tracked." items={[
      item("Most valuable customer action (earlier form)", answers.primaryConversion),
      item("Who answers new calls and messages", answers.responseOwner),
      item("Call tracking", answers.callTracking),
      item("How they track new customers", answers.outcomesTracking),
      item("Where website messages go", answers.formDestination),
      item("Problems with calls or follow-up", answers.leadChallenges),
    ]} />
    <DetailSection title="Updates and market context" caption="Who gets updates, how, and how they see their market." items={[
      item("Update recipients", answers.reportRecipients),
      item("Preferred way to get updates", withOther(answers.communicationPreference, answers.communicationOther)),
      item("Mobile number", answers.mobileNumber),
      item("Competitors", answers.competitors),
      item("Words customers use", answers.optionalKeywords),
      item("Anything else", answers.notes),
    ]} />
  </>;
}
