import "server-only";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import {
  airKits,
  airKitSetups,
  bookings,
  builds,
  carRequests,
  cars,
  coilovers,
  orderItems,
  orders,
  rims,
  users,
} from "./schema";
import type { SetupType } from "@/lib/catalog";

// All catalog reads live here so pages stay thin and queries stay efficient
// (relational `with` clauses batch their joins — no N+1 from the page layer).

// ── Air kits ────────────────────────────────────────────────────────

// Cars that have an air kit (the air-kit car picker). The card image prefers
// the air kit's own image, falling back to the car's. Owner views pass
// includeInactive to also surface deactivated air kits (badged).
export async function getAirKitCars(includeInactive = false) {
  const where = includeInactive
    ? eq(cars.isActive, true)
    : and(eq(cars.isActive, true), eq(airKits.isActive, true));
  return db
    .select({
      id: cars.id,
      slug: cars.slug,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      imageUrl: sql<string | null>`coalesce(${airKits.imageUrl}, ${cars.imageUrl})`,
      yearStart: cars.yearStart,
      yearEnd: cars.yearEnd,
      airKitActive: airKits.isActive,
    })
    .from(cars)
    .innerJoin(airKits, eq(airKits.carId, cars.id))
    .where(where)
    .orderBy(asc(cars.make), asc(cars.model));
}

// A car with its single air kit and that kit's setups (one round of joins).
export async function getAirKitByCarSlug(slug: string) {
  return db.query.cars.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      airKit: {
        with: {
          setups: {
            where: (s, { eq }) => eq(s.isActive, true),
          },
        },
      },
    },
  });
}

export async function getCarById(id: number) {
  return db.query.cars.findFirst({ where: (c, { eq }) => eq(c.id, id) });
}

// All cars (for owner add-product dropdowns). Includes whether each already
// has an air kit, so the air-kit form can exclude them. A LEFT JOIN (one air
// kit per car) is used instead of a correlated subquery, which Drizzle renders
// with an unqualified column reference inside the subquery.
export async function getAllCarsForAdmin() {
  return db
    .select({
      id: cars.id,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      slug: cars.slug,
      hasAirKit: sql<boolean>`${airKits.id} is not null`,
    })
    .from(cars)
    .leftJoin(airKits, eq(airKits.carId, cars.id))
    .orderBy(asc(cars.make), asc(cars.model));
}

export async function getAllCarSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: cars.slug }).from(cars);
  return rows.map((r) => r.slug);
}

// Full car rows for the owner cars manager (edit/delete).
export async function getCarsFull() {
  return db.select().from(cars).orderBy(asc(cars.make), asc(cars.model));
}

// Single-product lookups for owner edit forms.
export async function getRimById(id: number) {
  return db.query.rims.findFirst({ where: (r, { eq }) => eq(r.id, id) });
}

export async function getCoiloverById(id: number) {
  return db.query.coilovers.findFirst({ where: (c, { eq }) => eq(c.id, id) });
}

export async function getAirKitById(id: number) {
  return db.query.airKits.findFirst({
    where: (a, { eq }) => eq(a.id, id),
    with: { setups: true },
  });
}

// ── Coilovers ───────────────────────────────────────────────────────

// Cars that have at least one active coilover (the coilover car picker). The
// card image prefers the car's image, falling back to any coilover's image.
export async function getCoiloverCars() {
  return db
    .select({
      id: cars.id,
      slug: cars.slug,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      imageUrl: sql<string | null>`coalesce(${cars.imageUrl}, min(${coilovers.imageUrl}))`,
      yearStart: cars.yearStart,
      yearEnd: cars.yearEnd,
    })
    .from(cars)
    .innerJoin(coilovers, eq(coilovers.carId, cars.id))
    .where(and(eq(cars.isActive, true), eq(coilovers.isActive, true)))
    .groupBy(
      cars.id,
      cars.slug,
      cars.nameEn,
      cars.nameAr,
      cars.imageUrl,
      cars.yearStart,
      cars.yearEnd
    )
    .orderBy(asc(cars.slug));
}

// A car with its coilovers, newest manufacture date first. Owner views pass
// includeInactive to also see deactivated coilovers.
export async function getCoiloversByCarSlug(slug: string, includeInactive = false) {
  return db.query.cars.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      coilovers: {
        where: includeInactive ? undefined : (co, { eq }) => eq(co.isActive, true),
        orderBy: (co, { asc, desc }) => [
          asc(co.brand),
          desc(co.manufactureDate),
        ],
      },
    },
  });
}

// ── Rims ────────────────────────────────────────────────────────────

export type RimFilters = {
  diameter?: number;
  width?: string;
  boltPattern?: string;
  offset?: number;
  finish?: string;
};

export async function getRims(filters: RimFilters, includeInactive = false) {
  const conditions: SQL[] = [];
  if (!includeInactive) conditions.push(eq(rims.isActive, true));

  if (filters.diameter !== undefined)
    conditions.push(eq(rims.diameterInches, filters.diameter));
  if (filters.width) conditions.push(eq(rims.widthInches, filters.width));
  if (filters.boltPattern)
    conditions.push(eq(rims.boltPattern, filters.boltPattern));
  if (filters.offset !== undefined)
    conditions.push(eq(rims.offsetMm, filters.offset));
  if (filters.finish) conditions.push(eq(rims.finish, filters.finish));

  return db
    .select()
    .from(rims)
    .where(and(...conditions))
    .orderBy(asc(rims.diameterInches), asc(rims.pricePiastres));
}

// Distinct values for each spec, to populate the filter dropdowns.
export async function getRimFilterOptions() {
  const where = eq(rims.isActive, true);

  const [diameters, widths, boltPatterns, offsets, finishes] =
    await Promise.all([
      db
        .selectDistinct({ v: rims.diameterInches })
        .from(rims)
        .where(where)
        .orderBy(asc(rims.diameterInches)),
      db
        .selectDistinct({ v: rims.widthInches })
        .from(rims)
        .where(where)
        .orderBy(asc(rims.widthInches)),
      db
        .selectDistinct({ v: rims.boltPattern })
        .from(rims)
        .where(where)
        .orderBy(asc(rims.boltPattern)),
      db
        .selectDistinct({ v: rims.offsetMm })
        .from(rims)
        .where(where)
        .orderBy(asc(rims.offsetMm)),
      db
        .selectDistinct({ v: rims.finish })
        .from(rims)
        .where(where)
        .orderBy(asc(rims.finish)),
    ]);

  return {
    diameters: diameters.map((r) => r.v),
    widths: widths.map((r) => r.v),
    boltPatterns: boltPatterns.map((r) => r.v),
    offsets: offsets.map((r) => r.v),
    finishes: finishes.map((r) => r.v),
  };
}

// ── Revenue (owner-only) ────────────────────────────────────────────

// Money totals across paid/completed orders. Exposed only behind an owner
// guard (see admin/revenue). Returns 0s when there are no orders yet.
export async function getRevenueSummary() {
  // Revenue = orders that reached deposit_paid, balance_paid, or completed.
  const [row] = await db
    .select({
      totalPiastres: sql<number>`coalesce(sum(${orders.subtotalPiastres}), 0)`,
      paidOrders: count(orders.id),
    })
    .from(orders)
    .where(
      sql`${orders.status} in ('deposit_paid','balance_paid','completed')`
    );

  return {
    totalPiastres: Number(row?.totalPiastres ?? 0),
    paidOrders: Number(row?.paidOrders ?? 0),
  };
}

// ── Builds gallery ──────────────────────────────────────────────────

// Public gallery: active builds in manual order (then newest first).
export async function getActiveBuilds() {
  return db
    .select()
    .from(builds)
    .where(eq(builds.isActive, true))
    .orderBy(asc(builds.sortOrder), desc(builds.createdAt));
}

// Admin: every build (incl. inactive) in manual order.
export async function getAllBuilds() {
  return db
    .select()
    .from(builds)
    .orderBy(asc(builds.sortOrder), desc(builds.createdAt));
}

export async function getBuildById(id: number) {
  return db.query.builds.findFirst({ where: (b, { eq }) => eq(b.id, id) });
}

// ── Owner "new booking" notification ────────────────────────────────

// Count of confirmed bookings the owner hasn't acknowledged yet.
export async function getUnseenBookingCount(): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(eq(bookings.status, "confirmed"), eq(bookings.seenByOwner, false)));
  return Number(row?.n ?? 0);
}

// ── Order lookup (owner/staff, via QR reference) ────────────────────

export async function getBookingByOrderId(orderId: number) {
  return db.query.bookings.findFirst({
    where: (b, { eq }) => eq(b.orderId, orderId),
    with: {
      order: { with: { items: true } },
      car: true,
      user: true,
    },
  });
}

// ── Order history (for deactivate-vs-delete) ────────────────────────

export async function rimHasOrders(id: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(orderItems)
    .where(eq(orderItems.rimId, id));
  return Number(r?.n ?? 0) > 0;
}

export async function coiloverHasOrders(id: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(orderItems)
    .where(eq(orderItems.coiloverId, id));
  return Number(r?.n ?? 0) > 0;
}

// An air kit is "ordered" if any of its setups appears in an order.
export async function airKitHasOrders(airKitId: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(orderItems)
    .innerJoin(airKitSetups, eq(airKitSetups.id, orderItems.airKitSetupId))
    .where(eq(airKitSetups.airKitId, airKitId));
  return Number(r?.n ?? 0) > 0;
}

// Batched "which of these ids have order history" for owner list labels.
export async function rimIdsWithOrders(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ id: orderItems.rimId })
    .from(orderItems)
    .where(inArray(orderItems.rimId, ids));
  return new Set(rows.map((r) => r.id).filter((x): x is number => x != null));
}

export async function coiloverIdsWithOrders(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ id: orderItems.coiloverId })
    .from(orderItems)
    .where(inArray(orderItems.coiloverId, ids));
  return new Set(rows.map((r) => r.id).filter((x): x is number => x != null));
}

// ── Car attachments (for delete protection) ─────────────────────────

export async function getCarAttachments(
  carId: number
): Promise<{ airKits: number; coilovers: number }> {
  const [ak] = await db
    .select({ n: count() })
    .from(airKits)
    .where(eq(airKits.carId, carId));
  const [co] = await db
    .select({ n: count() })
    .from(coilovers)
    .where(eq(coilovers.carId, carId));
  return { airKits: Number(ak?.n ?? 0), coilovers: Number(co?.n ?? 0) };
}

// ── Staff accounts (owner-only) ─────────────────────────────────────

export async function getStaffList() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "staff"))
    .orderBy(asc(users.name));
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, id) });
}

// ── Car requests inbox (owner + staff) ──────────────────────────────

export async function getCarRequests() {
  return db
    .select()
    .from(carRequests)
    .orderBy(desc(carRequests.createdAt));
}

export type { SetupType };
