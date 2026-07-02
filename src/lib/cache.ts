import "server-only";
import { revalidateTag } from "next/cache";

// One tag covers all cached public catalog reads (see src/db/queries.ts). Any
// owner edit calls revalidateCatalog() so the change shows immediately instead
// of waiting out the cache TTL. A no-op in development (nothing is cached).
export const CATALOG_TAG = "catalog";

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
