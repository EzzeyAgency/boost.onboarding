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

/** First free slug: base, base-2, base-3... */
export function nextFreeSlug(base: string, taken: Iterable<string>) {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
