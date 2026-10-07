import type { Metadata } from "next";
import { getAdmin } from "@/auth";
import AccessPage from "@/components/AccessPage";
import BrandHeader from "@/components/BrandHeader";
import { SignOutButton } from "@/components/AuthButtons";
import LeadsDashboard from "@/components/LeadsDashboard";

export const metadata: Metadata = { title: "BOOST Submissions | Ezzey", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [admin, params] = await Promise.all([getAdmin(), searchParams]);
  if (!admin.isAdmin) return <AccessPage signedIn={admin.signedIn} denied={params.error === "AccessDenied"} configError={params.error === "Configuration"} redirectTo="/leads" subject="submissions" />;
  return (
    <main className="app-shell">
      <BrandHeader signOut={<SignOutButton />} />
      <LeadsDashboard />
    </main>
  );
}
