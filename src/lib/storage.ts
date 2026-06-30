import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// ─────────────────────────────────────────────────────────────────────
// Image storage.
//
// DEV (this implementation): saves uploads to `public/uploads/builds/` and
// returns a same-origin URL like `/uploads/builds/<uuid>.jpg`. Works with
// `next dev` and `next start` on a single persistent server.
//
// PRODUCTION: a serverless host (e.g. Vercel) has an ephemeral, read-only
// filesystem, so swap THIS MODULE for cloud object storage + CDN — Vercel Blob
// (simplest with Next.js) or Cloudflare R2 (cheapest, S3-compatible). The rest
// of the app only ever stores/reads a URL string, so the change is isolated to
// this file (and adding the storage host to next.config images.remotePatterns).
// ─────────────────────────────────────────────────────────────────────

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

  const dir = path.join(UPLOADS_ROOT, subdir);
  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `${PUBLIC_ROOT}/${subdir}/${filename}`;
}

// Best-effort delete of a locally-stored image (ignores remote URLs, e.g.
// placeholder picsum images, and missing files).
export async function deleteImage(url: string): Promise<void> {
  if (!url.startsWith(`${PUBLIC_ROOT}/`)) return;
  const rel = url.slice(`${PUBLIC_ROOT}/`.length);
  if (!rel || rel.includes("..")) return;
  try {
    await unlink(path.join(UPLOADS_ROOT, rel));
  } catch {
    // already gone — fine
  }
}
