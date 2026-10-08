/** Top-level paths the app already uses, which a business-name page must never take over. */
export const RESERVED_SLUGS = new Set(["api", "leads", "support", "_next", "favicon.ico", "robots.txt", "sitemap.xml", "ezzey-logo.jpg", "login", "admin", "health"]);

/** "Smith & Sons Plumbing, LLC" -> "smith-and-sons-plumbing-llc" */
export function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  if (!slug) return "client";
  return RESERVED_SLUGS.has(slug) ? `${slug}-client` : slug;
}

/**
 * Slug for a new client page. The first business with a name gets the plain name; a second business
 * with the same name gets the name plus city and state ("smith-plumbing-tempe-az"). Numbers are only
 * a last resort, if city and state are missing or that combination is also taken.
 */
export function clientSlug(companyName: string, city: string | null | undefined, state: string | null | undefined, taken: Iterable<string>) {
  const used = new Set(taken);
  const base = slugify(companyName);
  if (!used.has(base)) return base;
  const place = [city ?? "", state && state !== "OUT" ? state : ""].map(part => slugify(part)).filter(part => part && part !== "client").join("-");
  const located = place ? `${base}-${place}`.slice(0, 78).replace(/-+$/g, "") : base;
  return nextFreeSlug(located, used);
}

/** First free slug: base, base-2, base-3... */
export function nextFreeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
