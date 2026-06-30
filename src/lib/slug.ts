// Turn a make/model into a URL slug, e.g. "Mercedes C-Class W205" -> "mercedes-c-class-w205".
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Append -2, -3, … until the slug is unique among `taken`.
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "car";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
