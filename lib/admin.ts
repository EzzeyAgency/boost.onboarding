export function adminEmails(raw = process.env.ADMIN_EMAILS ?? "") {
  return raw.split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, raw?: string) {
  if (!email) return false;
  return adminEmails(raw).includes(email.trim().toLowerCase());
}
