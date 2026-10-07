import { z } from "zod";
import { getAdmin } from "@/auth";
import { listSubmissions } from "@/lib/db";
import { json } from "@/lib/respond";

const filters = z.object({
  submissionType: z.enum(["onboarding", "support"]).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin.isAdmin) return json({ error: "Not found" }, 404);

  const params = Object.fromEntries([...new URL(request.url).searchParams].filter(([, value]) => value !== ""));
  const parsed = filters.safeParse(params);
  if (!parsed.success) return json({ error: "Invalid filters" }, 400);

  const rows = await listSubmissions(parsed.data);
  return json({ rows });
}
