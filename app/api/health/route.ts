import { json } from "@/lib/respond";
import { missingSettings } from "@/lib/config-check";

export const dynamic = "force-dynamic";

// Reports only which required settings are missing (names, never values) to help diagnose a deployment.
export async function GET() {
  const missing = missingSettings();
  return json({ ok: missing.length === 0, missing });
}
