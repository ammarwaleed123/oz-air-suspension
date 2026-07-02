import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del } from "@vercel/blob";

// ─────────────────────────────────────────────────────────────────────
// Image storage — two backends behind ONE interface (saveImage/deleteImage).
//
// • Vercel Blob (production): used automatically when BLOB_READ_WRITE_TOKEN is
//   set. Vercel injects this env var once you create a Blob store, so deployed
//   uploads persist on a CDN (the local filesystem there is ephemeral/read-only).
//   You can also set the token locally to test Blob in dev.
//
// • Local disk (development default): saves to public/uploads/<subdir>/ and
//   returns a same-origin URL. Used when no Blob token is present, so `next dev`
//   works with zero setup.
//
// The rest of the app only ever stores/reads a URL string, so nothing else
// changes regardless of backend.
// ─────────────────────────────────────────────────────────────────────

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const PUBLIC_ROOT = "/uploads";

// Subfolders we allow uploads into (one per image-bearing entity).
export type ImageSubdir =
  | "builds"
  | "rims"
  | "coilovers"
  | "air-kits"
  | "cars";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

export class UploadError extends Error {
  constructor(public code: "invalid_type" | "too_large" | "empty") {
    super(code);
    this.name = "UploadError";
  }
}

export async function saveImage(
  file: File,
  subdir: ImageSubdir
): Promise<string> {
  if (!file || file.size === 0) throw new UploadError("empty");
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new UploadError("invalid_type");
  if (file.size > MAX_BYTES) throw new UploadError("too_large");

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (USE_BLOB) {
    // Public CDN-backed blob. `addRandomSuffix:false` — our UUID is already unique.
    const { url } = await put(`${subdir}/${filename}`, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return url;
  }

  const dir = path.join(UPLOADS_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `${PUBLIC_ROOT}/${subdir}/${filename}`;
}

// Best-effort delete. Handles both backends and ignores foreign URLs (e.g.
// placeholder picsum images) and already-missing files.
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;

  // Vercel Blob URL (absolute, on the blob storage host).
  if (url.includes(".public.blob.vercel-storage.com")) {
    try {
      await del(url);
    } catch {
      // already gone / not ours — fine
    }
    return;
  }

  // Local disk URL.
  if (url.startsWith(`${PUBLIC_ROOT}/`)) {
    const rel = url.slice(`${PUBLIC_ROOT}/`.length);
    if (!rel || rel.includes("..")) return;
    try {
      await unlink(path.join(UPLOADS_ROOT, rel));
    } catch {
      // already gone — fine
    }
  }
}
