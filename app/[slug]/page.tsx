import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getAdmin } from "@/auth";
import AccessPage from "@/components/AccessPage";
import ClientPageView from "@/components/ClientPageView";
import { getDraftById, getPageBySlug, getSubmissionById } from "@/lib/db";
import { SLUG_PATTERN } from "@/lib/slug";

export const metadata: Metadata = { title: "Client onboarding | BOOST", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();

  const admin = await getAdmin();
  // Sign-in check comes before any lookup, so business names can't be probed.
  if (!admin.isAdmin) return <AccessPage signedIn={admin.signedIn} redirectTo={`/${slug}`} subject="this client page" />;

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const submission = page.submissionId ? await getSubmissionById(page.submissionId) : null;
  const draft = !submission && page.draftId ? await getDraftById(page.draftId) : null;
  if (!submission && !draft) notFound();

  const host = (await headers()).get("host");
  const pageUrl = `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || `https://${host}`}/${page.slug}`;
  return <ClientPageView page={page} submission={submission} draft={draft} pageUrl={pageUrl} />;
}
