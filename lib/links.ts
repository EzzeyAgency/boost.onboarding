export const LINKS = {
  leadsie: process.env.NEXT_PUBLIC_LEADSIE_CONNECT_URL || "https://app.leadsie.com/connect/ezzey/manage",
  googleBusiness: process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL || "https://business.google.com/",
  setupVideo: process.env.NEXT_PUBLIC_GBP_SETUP_VIDEO_URL || "https://www.youtube.com/watch?v=VrawbXIY3V4",
  ezzey: "https://ezzey.com/",
};

/** Only http(s) links may be rendered as clickable. */
export function safeHttpUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
}
