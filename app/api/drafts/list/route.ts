import { getAdmin } from "@/auth";
import { listOpenDrafts } from "@/lib/db";
import { json } from "@/lib/respond";

export const dynamic = "force-dynamic";

/** Admin only: onboarding forms customers started but haven't submitted. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin.isAdmin) return json({ error: "Not found" }, 404);
  return json({ rows: await listOpenDrafts() });
}
