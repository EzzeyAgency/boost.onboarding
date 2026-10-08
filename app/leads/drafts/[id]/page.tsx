import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Footprints, Mail, UserRound } from "lucide-react";
import { getAdmin } from "@/auth";
import AccessPage from "@/components/AccessPage";
import BrandHeader from "@/components/BrandHeader";
import LocalDate from "@/components/LocalDate";
import { SignOutButton } from "@/components/AuthButtons";
import { OnboardingProfile, displayValue } from "@/components/ProfileSections";
import { getDraftById, getPageFor } from "@/lib/db";
import { steps } from "@/lib/form";

export const metadata: Metadata = { title: "In-progress onboarding | BOOST", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DraftDetail({ params }: { params: Promise<{ id: string }> }) {
  const [admin, { id: rawId }] = await Promise.all([getAdmin(), params]);
  if (!admin.isAdmin) return <AccessPage signedIn={admin.signedIn} redirectTo={`/leads/drafts/${encodeURIComponent(rawId)}`} subject="this onboarding" />;

  const id = Number(rawId);
  const draft = Number.isInteger(id) && id > 0 ? await getDraftById(id) : null;
  if (!draft) return <main className="app-shell"><BrandHeader signOut={<SignOutButton />} /><section className="detail-empty"><FileText size={34} /><h1>Onboarding not found.</h1><Link href="/leads" className="secondary-button">Return to submissions</Link></section></main>;

  const clientPage = await getPageFor({ draftId: draft.id }).catch(() => null);
  const name = [draft.firstName, draft.lastName].filter(Boolean).join(" ") || "Name not entered yet";
  const stoppedAt = steps[Math.min(draft.step, steps.length - 1)];

  return <main className="app-shell">
    <BrandHeader signOut={<SignOutButton />} />
    <section className="business-detail-page">
      <Link href="/leads" className="detail-back"><ArrowLeft size={17} /> Back to submissions</Link>
      {clientPage && <p className="client-page-link"><Link className="view-business-link" href={`/${clientPage.slug}`}>Open client page: /{clientPage.slug}</Link></p>}
      <div className="business-detail-hero">
        <div>
          <p className="eyebrow">{draft.completedAt ? "SUBMITTED ONBOARDING (SAVED DRAFT)" : "IN-PROGRESS ONBOARDING"}</p>
          <h1>{draft.companyName || "Business name not entered yet"}</h1>
          <p>Started <LocalDate value={draft.createdAt} />. Last saved <LocalDate value={draft.updatedAt} />.</p>
        </div>
        <div className="business-statuses">
          <span className="status-chip customer_action_pending">{draft.completedAt ? "Submitted" : "Not submitted"}</span>
          {draft.googleAccessStatus && <span className="type-chip onboarding">{displayValue(draft.googleAccessStatus)}</span>}
        </div>
      </div>
      <div className="business-call-strip">
        <div><UserRound size={19} /><span>Contact</span><b>{name}</b></div>
        <div><Mail size={19} /><span>Email</span><a href={`mailto:${draft.email}`}>{draft.email}</a></div>
        <div><Footprints size={19} /><span>Stopped at</span><b>Step {draft.step + 1}: {stoppedAt.label}</b></div>
        <div><CalendarDays size={19} /><span>Last saved</span><b><LocalDate value={draft.updatedAt} dateOnly /></b></div>
      </div>
      {draft.completedAt && draft.submissionId && <div className="business-detail-intro"><FileText size={20} /><p>This customer finished and submitted. <Link href={`/leads/${draft.submissionId}`}>Open the submitted profile</Link>.</p></div>}
      {!draft.completedAt && <div className="business-detail-intro"><FileText size={20} /><p>These are the answers saved so far. Use them to follow up and help the customer finish, especially any Google step they stopped on.</p></div>}
      <div className="business-section-list"><OnboardingProfile answers={draft.data} googleAccessStatus={draft.googleAccessStatus} /></div>
    </section>
  </main>;
}
