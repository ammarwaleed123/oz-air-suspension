import "server-only";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";
import type { Locale } from "@/i18n/config";

export type AppRole = "customer" | "staff" | "owner";

// Raw session (token-based) — fine for cheap UI hints, NOT for authorization.
export async function getSession() {
  return auth();
}

// Authoritative current user, loaded fresh from the DB. Authorization decisions
// use THIS (not the JWT) so a demoted/removed account loses access immediately.
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const idStr = session?.user?.id;
  if (!idStr) return null;
  const id = Number(idStr);
  if (!Number.isInteger(id)) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  // A deactivated account loses access immediately, even with a valid session.
  if (!user || !user.isActive) return null;
  return user;
}

// Require any authenticated user; otherwise bounce to login.
export async function requireUser(locale: Locale): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

// Require one of the allowed roles. Unauthenticated → login. Authenticated but
// unauthorized → 404 (also avoids leaking the existence of admin routes).
export async function requireRole(
  locale: Locale,
  allowed: AppRole[]
): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (!allowed.includes(user.role)) notFound();
  return user;
}

export function requireOwner(locale: Locale) {
  return requireRole(locale, ["owner"]);
}

export function requireStaffOrOwner(locale: Locale) {
  return requireRole(locale, ["staff", "owner"]);
}
