import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, FileText, Globe2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getAdmin } from "@/auth";
import AccessPage from "@/components/AccessPage";
import BrandHeader from "@/components/BrandHeader";
import LocalDate from "@/components/LocalDate";
import { SignOutButton } from "@/components/AuthButtons";
import type { Submission } from "@/db/schema";
import { getSubmissionById } from "@/lib/db";
import { safeHttpUrl } from "@/lib/links";

export const metadata: Metadata = { title: "Business profile | BOOST", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SubmissionDetail = Submission;
type Answers = Record<string, unknown>;
type DetailItem = { label: string; value: unknown; href?: string };

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.includes("_")) return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
  return String(value);
}

function item(label: string, value: unknown, link = false): DetailItem {
  return { label, value, href: link ? safeHttpUrl(value) : undefined };
}

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

function SupportProfile({ record }: { record: SubmissionDetail }) {
  const answers = record.answers as Answers;
  return <>
    <DetailSection title="Support request" caption="The exact customer request and the category used for routing." items={[
      item("Request category", record.supportTopic ?? answers.topic),
      item("Customer message", record.message ?? answers.message),
    ]} />
    <DetailSection title="Business contact" caption="Use these details to continue the support conversation." items={[
      item("Business name", record.companyName),
      item("Contact name", `${record.firstName} ${record.lastName ?? ""}`.trim()),
      item("Email", record.email),
    ]} />
  </>;
}

function OnboardingProfile({ record }: { record: SubmissionDetail }) {
  const answers = record.answers as Answers;
  return <>
    <DetailSection title="Business overview" caption="A concise profile to anchor the sales or reporting conversation." items={[
      item("What the business does", answers.businessDescription),
      item("Business role", answers.businessRole),
      item("Website", answers.website, true),
      item("What makes it different", answers.differentiator),
      item("Services, customers, or locations to avoid", answers.exclusions),
    ]} />
    <DetailSection title="Growth goals" caption="The outcomes, markets, and work this business wants BOOST to improve." items={[
      item("Primary outcome", answers.primaryOutcome),
      item("90-day success target", answers.success90),
      item("12-month success target", answers.successYear),
      item("Growth priority", answers.growthFocus),
      item("Areas to grow", answers.growthAreas),
      item("Highest-value customers or work", answers.highValueWork),
    ]} />
    <DetailSection title="Google Business Profile" caption="Read this before discussing visibility, reputation, or the next access step." items={[
      item("Profile status", record.googleProfileStatus ?? answers.googleProfileState),
      item("Google access status", record.googleAccessStatus),
      item("Secure access completion", answers.googleAccessCompletion),
      item("Setup or verification status", answers.setupStatus),
      item("Access recovery issue", answers.recoveryIssue),
      item("Authority to manage profile", answers.googleAuthority),
      item("Business service model", answers.serviceMode),
      item("Business address", answers.businessAddress),
      item("Business phone", answers.businessPhone),
      item("Business hours", answers.businessHours),
      item("Access or setup blocker", answers.googleAccessBlocker ?? answers.setupHelp),
    ]} />
    <DetailSection title="Lead flow and tracking" caption="Use these answers to connect work to sales operations and measurable outcomes." items={[
      item("Most valuable customer action", answers.primaryConversion),
      item("Who responds to new inquiries", answers.responseOwner),
      item("Call-tracking status", answers.callTracking),
      item("Outcome-tracking method", answers.outcomesTracking),
      item("Where website leads go", answers.formDestination),
      item("Lead-flow challenges", answers.leadChallenges),
    ]} />
    <DetailSection title="Reporting and strategy context" caption="The customer’s preferred communication plan and market perspective." items={[
      item("Reporting recipients", answers.reportRecipients),
      item("Communication preference", answers.communicationPreference),
      item("Mobile number", answers.mobileNumber),
      item("Relevant competitors", answers.competitors),
      item("Customer keyword perspective", answers.optionalKeywords),
      item("Additional notes", answers.notes),
    ]} />
  </>;
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const [admin, { id: rawId }] = await Promise.all([getAdmin(), params]);
  // Authorization happens before any record lookup, so guessing IDs reveals nothing.
  if (!admin.isAdmin) return <AccessPage signedIn={admin.signedIn} redirectTo={`/leads/${encodeURIComponent(rawId)}`} subject="this business profile" />;

  const id = Number(rawId);
  const record = Number.isInteger(id) && id > 0 ? await getSubmissionById(id) : null;
  if (!record) return <main className="app-shell"><BrandHeader signOut={<SignOutButton />} /><section className="detail-empty"><FileText size={34}/><h1>Business profile not found.</h1><p>The requested submission may not exist or may no longer be available.</p><Link href="/leads" className="secondary-button">Return to submissions</Link></section></main>;

  const isOnboarding = record.submissionType === "onboarding";
  const customerName = `${record.firstName} ${record.lastName ?? ""}`.trim();

  return <main className="app-shell">
    <BrandHeader signOut={<SignOutButton />} />
    <section className="business-detail-page">
      <Link href="/leads" className="detail-back"><ArrowLeft size={17}/> Back to submissions</Link>
      <div className="business-detail-hero">
        <div>
          <p className="eyebrow">{isOnboarding ? "CALL-READY BUSINESS PROFILE" : "CALL-READY SUPPORT PROFILE"}</p>
          <h1>{record.companyName}</h1>
          <p>Submitted by {customerName} on <LocalDate value={record.submittedAt} />.</p>
        </div>
        <div className="business-statuses">
          <span className={`status-chip ${record.formStatus}`}>{displayValue(record.formStatus)}</span>
          {isOnboarding && <span className="type-chip onboarding">{displayValue(record.googleAccessStatus)}</span>}
          {!isOnboarding && <span className="type-chip support">{record.supportTopic ?? "Support request"}</span>}
        </div>
      </div>

      <div className="business-call-strip">
        <div><Building2 size={19}/><span>Business</span><b>{record.companyName}</b></div>
        <div><UserRound size={19}/><span>Primary contact</span><b>{customerName}</b></div>
        <div><Mail size={19}/><span>Email</span><a href={`mailto:${record.email}`}>{record.email}</a></div>
        <div><CalendarDays size={19}/><span>Submitted</span><b><LocalDate value={record.submittedAt} dateOnly /></b></div>
      </div>

      <div className="business-detail-intro"><ShieldCheck size={20}/><p>{isOnboarding ? "Use this profile as a clear reference during reporting, strategy, and sales calls. Every answer supplied by the business is organized below." : "Use this profile to understand the customer’s support issue, prepare the conversation, and route the next step."}</p></div>
      <div className="business-section-list">{isOnboarding ? <OnboardingProfile record={record} /> : <SupportProfile record={record} />}</div>
    </section>
  </main>;
}
