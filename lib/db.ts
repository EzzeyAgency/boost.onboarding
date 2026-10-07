import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { submissions, type NewSubmission } from "@/db/schema";

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
