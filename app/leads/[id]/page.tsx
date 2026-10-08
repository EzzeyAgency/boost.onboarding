import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, FileText, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getAdmin } from "@/auth";
import AccessPage from "@/components/AccessPage";
import BrandHeader from "@/components/BrandHeader";
import LocalDate from "@/components/LocalDate";
import { SignOutButton } from "@/components/AuthButtons";
import { getSubmissionById } from "@/lib/db";
import { OnboardingProfile, SupportProfile, displayValue } from "@/components/ProfileSections";

export const metadata: Metadata = { title: "Business profile | BOOST", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

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
      <div className="business-section-list">{isOnboarding ? <OnboardingProfile answers={record.answers as Record<string, unknown>} googleAccessStatus={record.googleAccessStatus} /> : <SupportProfile answers={record.answers as Record<string, unknown>} topic={record.supportTopic} message={record.message} contact={{ companyName: record.companyName, name: customerName, email: record.email }} />}</div>
    </section>
  </main>;
}
