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
 * Slug for a new client page: business name plus city and state, e.g. "smith-plumbing-tempe-az".
 * Only an exact repeat (same name, city and state) gets -1, -2, -3. Older records without a city fall back to the name.
 */
export function clientSlug(companyName: string, city: string | null | undefined, state: string | null | undefined, taken: Iterable<string>) {
  const name = slugify(companyName);
  const place = [city ?? "", state && state !== "OUT" ? state : ""].map(part => slugify(part)).filter(part => part && part !== "client").join("-");
  const slug = (place ? `${name}-${place}` : name).slice(0, 78).replace(/-+$/g, "");
  return nextFreeSlug(slug, taken);
}

/** First free slug: base, then base-1, base-2... for duplicates. */
export function nextFreeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 1; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
