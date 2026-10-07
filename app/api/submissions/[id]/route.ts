import { getAdmin } from "@/auth";
import { getSubmissionById } from "@/lib/db";
import { json } from "@/lib/respond";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  // Same generic response for unauthorized and missing records so IDs cannot be probed.
  if (!admin.isAdmin) return json({ error: "Not found" }, 404);
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Not found" }, 404);
  const row = await getSubmissionById(id);
  if (!row) return json({ error: "Not found" }, 404);
  return json({ row });
}
