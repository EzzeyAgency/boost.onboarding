import { LockKeyhole } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";

export default function AccessPage({ signedIn, denied, configError, redirectTo, subject }: { signedIn: boolean; denied?: boolean; configError?: boolean; redirectTo: string; subject: string }) {
  const restricted = signedIn || denied;
  return (
    <main className="app-shell">
      <BrandHeader signOut={signedIn ? <SignOutButton /> : undefined} />
      <section className="access-page">
        <LockKeyhole size={32} />
        <p className="eyebrow">{restricted ? "ACCESS RESTRICTED" : "INTERNAL ACCESS"}</p>
        <h1>{restricted ? "This review area is administrator-only." : `Sign in to review ${subject}.`}</h1>
        <p>
          {restricted
            ? "That Google account is not on the Ezzey administrator list, so it cannot view customer submission data. Sign in with an authorized Ezzey account."
            : "This area contains customer onboarding and support data and is available only to authorized Ezzey team members."}
        </p>
        {configError && !signedIn && <p className="form-error" role="alert">Sign-in is not set up correctly on this deployment. An administrator can check the required settings at /api/health, then redeploy.</p>}
        {!signedIn && <SignInButton redirectTo={redirectTo} />}
      </section>
    </main>
  );
}
