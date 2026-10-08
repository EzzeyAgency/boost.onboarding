import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, gte, isNull, like, lt, or, type SQL } from "drizzle-orm";
import { clientPages, drafts, submissions, type NewSubmission } from "@/db/schema";
import { clientSlug, slugify } from "@/lib/slug";

let client: ReturnType<typeof drizzle> | undefined;

function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    client = drizzle(neon(url));
  }
  return client;
}

export async function createSubmission(values: NewSubmission) {
  const [row] = await db().insert(submissions).values(values).returning({ id: submissions.id });
  return row.id;
}

export type ListFilters = { submissionType?: "onboarding" | "support"; fromDate?: string; toDate?: string };

export async function listSubmissions(filters: ListFilters) {
  const conditions: SQL[] = [];
  if (filters.submissionType) conditions.push(eq(submissions.submissionType, filters.submissionType));
  if (filters.fromDate) conditions.push(gte(submissions.submittedAt, new Date(`${filters.fromDate}T00:00:00Z`)));
  if (filters.toDate) {
    // Inclusive of the whole "to" day.
    const end = new Date(`${filters.toDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    conditions.push(lt(submissions.submittedAt, end));
  }
  return db()
    .select({
      id: submissions.id,
      submissionType: submissions.submissionType,
      firstName: submissions.firstName,
      lastName: submissions.lastName,
      email: submissions.email,
      companyName: submissions.companyName,
      formStatus: submissions.formStatus,
      googleProfileStatus: submissions.googleProfileStatus,
      googleAccessStatus: submissions.googleAccessStatus,
      supportTopic: submissions.supportTopic,
      message: submissions.message,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(submissions.submittedAt), desc(submissions.id))
    .limit(5000);
}

export async function getSubmissionById(id: number) {
  const [row] = await db().select().from(submissions).where(eq(submissions.id, id)).limit(1);
  return row ?? null;
}

export type DraftFields = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  googleProfileStatus: string | null;
  googleAccessStatus: string | null;
  step: number;
  data: Record<string, unknown>;
};

/** Creates or updates a draft identified by the hash of its secret resume token. Completed drafts cannot be changed. */
export async function saveDraft(tokenHash: string, fields: DraftFields) {
  const [row] = await db()
    .insert(drafts)
    .values({ tokenHash, ...fields })
    .onConflictDoUpdate({ target: drafts.tokenHash, set: { ...fields, updatedAt: new Date() }, setWhere: isNull(drafts.completedAt) })
    .returning({ id: drafts.id, createdAt: drafts.createdAt, updatedAt: drafts.updatedAt });
  return row ?? null;
}

export async function getDraftByTokenHash(tokenHash: string) {
  const [row] = await db().select().from(drafts).where(and(eq(drafts.tokenHash, tokenHash), isNull(drafts.completedAt))).limit(1);
  return row ?? null;
}

/** Marks the draft submitted and returns its id, so its client page can switch to the submission. */
export async function completeDraft(tokenHash: string, submissionId: number) {
  const [row] = await db()
    .update(drafts)
    .set({ completedAt: new Date(), submissionId })
    .where(and(eq(drafts.tokenHash, tokenHash), isNull(drafts.completedAt)))
    .returning({ id: drafts.id });
  return row?.id ?? null;
}

export async function listOpenDrafts() {
  return db()
    .select({
      id: drafts.id,
      email: drafts.email,
      firstName: drafts.firstName,
      lastName: drafts.lastName,
      companyName: drafts.companyName,
      googleProfileStatus: drafts.googleProfileStatus,
      googleAccessStatus: drafts.googleAccessStatus,
      step: drafts.step,
      createdAt: drafts.createdAt,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .where(isNull(drafts.completedAt))
    .orderBy(desc(drafts.updatedAt), desc(drafts.id))
    .limit(5000);
}

export async function getDraftById(id: number) {
  const [row] = await db().select().from(drafts).where(eq(drafts.id, id)).limit(1);
  return row ?? null;
}

export async function getPageBySlug(slug: string) {
  const [row] = await db().select().from(clientPages).where(eq(clientPages.slug, slug)).limit(1);
  return row ?? null;
}

export async function getPageFor(ref: { draftId?: number | null; submissionId?: number | null }) {
  const conditions: SQL[] = [];
  if (ref.submissionId) conditions.push(eq(clientPages.submissionId, ref.submissionId));
  if (ref.draftId) conditions.push(eq(clientPages.draftId, ref.draftId));
  if (!conditions.length) return null;
  const [row] = await db().select().from(clientPages).where(or(...conditions)).limit(1);
  return row ?? null;
}

/**
 * Returns the customer's page, creating it on first call. The slug comes from the business name,
 * gets -2, -3... when taken, and never changes afterwards so links already shared stay valid.
 */
export async function ensureClientPage(input: { email: string; companyName: string; city?: string | null; state?: string | null; draftId?: number | null; submissionId?: number | null }) {
  const existing = await getPageFor(input);
  if (existing) {
    if (input.submissionId && existing.submissionId !== input.submissionId) {
      await db().update(clientPages).set({ submissionId: input.submissionId, email: input.email, updatedAt: new Date() }).where(eq(clientPages.id, existing.id));
    }
    return { page: existing, created: false };
  }
  const base = slugify(input.companyName);
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await db().select({ slug: clientPages.slug }).from(clientPages).where(or(eq(clientPages.slug, base), like(clientPages.slug, `${base}-%`)));
    const slug = clientSlug(input.companyName, input.city, input.state, taken.map(row => row.slug));
    const [page] = await db()
      .insert(clientPages)
      .values({ slug, email: input.email, companyName: input.companyName, draftId: input.draftId ?? null, submissionId: input.submissionId ?? null })
      .onConflictDoNothing({ target: clientPages.slug })
      .returning();
    if (page) return { page, created: true };
  }
  throw new Error("could not allocate a client page slug");
}
