import { adminEmails } from "@/lib/admin";

/** Names of required settings that are missing. Never returns values. */
export function missingAuthSettings(env: Record<string, string | undefined> = process.env) {
  const missing: string[] = [];
  if (!env.AUTH_SECRET && !env.NEXTAUTH_SECRET) missing.push("AUTH_SECRET");
  if (!env.AUTH_GOOGLE_ID) missing.push("AUTH_GOOGLE_ID");
  if (!env.AUTH_GOOGLE_SECRET) missing.push("AUTH_GOOGLE_SECRET");
  if (!adminEmails(env.ADMIN_EMAILS).length) missing.push("ADMIN_EMAILS");
  return missing;
}

export function missingSettings(env: Record<string, string | undefined> = process.env) {
  const missing = missingAuthSettings(env);
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  return missing;
}
