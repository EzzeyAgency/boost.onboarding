import Link from "next/link";
import { CalendarDays, Globe2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import CopyLink from "@/components/CopyLink";
import LocalDate from "@/components/LocalDate";
import { SignOutButton } from "@/components/AuthButtons";
import { OnboardingProfile } from "@/components/ProfileSections";
import { CONTACT_OTHER, COMM_OTHER, googleProfileLabel, steps } from "@/lib/form";
import { safeHttpUrl } from "@/lib/links";

type Answers = Record<string, unknown>;
const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const accessTone: Record<string, { label: string; tone: string }> = {
  confirmed: { label: "Google connected", tone: "good" },
  support_needed: { label: "Needs help with Google", tone: "bad" },
  customer_action_pending: { label: "Google step not finished", tone: "warn" },
  setup_or_verification_pending: { label: "Setting up or verifying Google", tone: "warn" },
  access_recovery_pending: { label: "Recovering Google access", tone: "warn" },
  status_check_pending: { label: "Checking Google status", tone: "warn" },
};

function Glance({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  if (!value) return null;
  return <div className={wide ? "glance-card wide" : "glance-card"}><span>{label}</span><p>{value}</p></div>;
}

export type ClientPageData = {
  slug: string;
  pageUrl: string;
  email: string;
  companyName: string;
  submission: { id: number; submittedAt: Date | string; answers: unknown; googleAccessStatus: string | null } | null;
  draft: { id: number; step: number; updatedAt: Date | string; data: unknown; googleAccessStatus: string | null } | null;
};

/** The at-a-glance client page. Pure display, so it can be rendered from any data source. */
export default function ClientPageView({ page, submission, draft, pageUrl, signedIn = false, isAdmin = false }: { page: { slug: string; email: string; companyName: string }; submission: ClientPageData["submission"]; draft: ClientPageData["draft"]; pageUrl: string; signedIn?: boolean; isAdmin?: boolean }) {
  const answers = (submission?.answers ?? draft?.data ?? {}) as Answers;
  const accessStatus = submission?.googleAccessStatus ?? draft?.googleAccessStatus ?? null;
  const access = accessStatus ? accessTone[accessStatus] : null;
  const name = [str(answers.firstName), str(answers.lastName)].filter(Boolean).join(" ");
  const role = str(answers.businessRole);
  const website = safeHttpUrl(answers.website) ?? (str(answers.website) ? `https://${str(answers.website).replace(/^\/+/, "")}` : undefined);
  const phone = str(answers.businessPhone) || str(answers.mobileNumber);
  const preferredContact = answers.preferredContact === CONTACT_OTHER ? str(answers.preferredContactOther) : str(answers.preferredContact);
  const updates = [str(answers.reportRecipients), answers.communicationPreference === COMM_OTHER ? str(answers.communicationOther) : str(answers.communicationPreference)].filter(Boolean).join(" · Prefers: ");
  const state = str(answers.businessState);
  const location = [str(answers.businessCity), state === "OUT" ? "Outside the US" : state].filter(Boolean).join(", ");
  const stoppedAt = draft ? steps[Math.min(draft.step, steps.length - 1)] : null;

  return <main className="app-shell">
    <BrandHeader signOut={signedIn ? <SignOutButton /> : undefined} />
    <section className="business-detail-page client-page">
      <div className="business-detail-hero">
        <div>
          <p className="eyebrow">BOOST CLIENT ONBOARDING</p>
          <h1>{str(answers.companyName) || page.companyName}</h1>
          {location && <p className="client-location">{location}</p>}
          <p>{submission ? <>Onboarding submitted <LocalDate value={submission.submittedAt} />.</> : <>Onboarding in progress. Last saved <LocalDate value={draft!.updatedAt} />.</>}</p>
        </div>
        <div className="business-statuses">
          {submission ? <span className="status-chip ready_for_fulfillment">Submitted</span> : <span className="status-chip customer_action_pending">In progress · step {draft!.step + 1} of {steps.length}</span>}
          {access && <span className={`tone-chip ${access.tone}`}>{access.label}</span>}
        </div>
      </div>

      <div className="business-call-strip">
        <div><UserRound size={19} /><span>Contact</span><b>{name || "Not entered yet"}{role && <small>{role}</small>}</b></div>
        <div><Mail size={19} /><span>Email</span><a href={`mailto:${page.email}`}>{page.email}</a></div>
        <div><Phone size={19} /><span>Phone</span>{phone ? <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : <b>Not provided</b>}</div>
        <div><Globe2 size={19} /><span>Website</span>{website ? <a href={website} target="_blank" rel="noreferrer">{str(answers.website)}</a> : <b>{answers.websiteStatus === "no" ? "No website" : "Not provided"}</b>}</div>
      </div>

      <div className="client-actions">
        <CopyLink url={pageUrl} />
        <a className="secondary-button" href={`mailto:${page.email}`}><Mail size={16} /> Email {str(answers.firstName) || "contact"}</a>
        {isAdmin && <Link className="secondary-button" href={submission ? `/leads/${submission.id}` : `/leads/drafts/${draft!.id}`}><CalendarDays size={16} /> Open in leads</Link>}
      </div>

      {stoppedAt && <div className="business-detail-intro"><ShieldCheck size={20} /><p>They haven't submitted yet. They stopped at <b>{stoppedAt.label}</b>. Use this page to help them finish, especially any Google step.</p></div>}

      <h2 className="glance-title">At a glance</h2>
      <div className="glance-grid">
        <Glance label="Google Business Profile" value={googleProfileLabel(answers.googleProfileState)} />
        <Glance label="How they want new customers to reach out" value={preferredContact} />
        <Glance label="Want more of" value={str(answers.growthFocus)} />
        <Glance label="What they do" value={str(answers.businessDescription)} wide />
        <Glance label="Where" value={str(answers.growthAreas)} />
        <Glance label="What's holding them back" value={str(answers.holdingBack)} wide />
        <Glance label="A great first 90 days" value={str(answers.success90)} />
        <Glance label="Most valuable customers or jobs" value={str(answers.highValueWork)} />
        <Glance label="What makes them different" value={str(answers.differentiator)} />
        <Glance label="Updates go to" value={updates} />
      </div>

      <h2 className="glance-title">Everything they told us</h2>
      <div className="business-section-list"><OnboardingProfile answers={answers} googleAccessStatus={access?.label ?? accessStatus} /></div>
    </section>
  </main>;
}
