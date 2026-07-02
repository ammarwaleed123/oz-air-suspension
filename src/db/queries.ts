import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { CATALOG_TAG } from "@/lib/cache";
import {
  airKits,
  airKitSetups,
  airKitFitments,
  airKitFitmentPrices,
  bookings,
  brands,
  builds,
  carRequests,
  cars,
  coilovers,
  coiloverFitments,
  orderItems,
  orders,
  rims,
  users,
} from "./schema";
import type { SetupType } from "@/lib/catalog";

// All catalog reads live here so pages stay thin and queries stay efficient
// (relational `with` clauses batch their joins — no N+1 from the page layer).

// ── Read caching ────────────────────────────────────────────────────
// The public catalog reads change rarely, so in PRODUCTION we cache them in
// Next's Data Cache under one tag. Owner edits call revalidateCatalog() (see
// mutation actions) to refresh instantly; otherwise entries expire after
// CATALOG_TTL as a fallback (covers any out-of-band DB edits). In DEVELOPMENT
// caching is OFF so every page always reads live data — no "why isn't my seed
// script showing?" confusion. Rim stock is deliberately NOT cached (it changes
// on every reservation), so stock is always live.
const CATALOG_TTL = 60; // seconds
const CACHE_ON = process.env.NODE_ENV === "production";

function cached<A extends unknown[], T>(
  key: string,
  fn: (...args: A) => Promise<T>
): (...args: A) => Promise<T> {
  if (!CACHE_ON) return fn;
  return unstable_cache(fn, [key], {
    tags: [CATALOG_TAG],
    revalidate: CATALOG_TTL,
  });
}

// ── Brands ──────────────────────────────────────────────────────────

export async function getBrands() {
  return db.select().from(brands).orderBy(asc(brands.nameEn));
}

export async function getBrandById(id: number) {
  return db.query.brands.findFirst({ where: (b, { eq }) => eq(b.id, id) });
}

// Whether a brand still has any car (used to block deletion).
export async function brandHasCars(brandId: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(cars)
    .where(eq(cars.brandId, brandId));
  return Number(r?.n ?? 0) > 0;
}

// ── Cars ────────────────────────────────────────────────────────────

// Full car rows joined with their brand (for the owner cars manager + the
// product-assignment dropdowns). Ordered brand → model.
export async function getCarsWithBrand() {
  return db
    .select({
      id: cars.id,
      slug: cars.slug,
      brandId: cars.brandId,
      brandEn: brands.nameEn,
      brandAr: brands.nameAr,
      model: cars.model,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      yearStart: cars.yearStart,
      yearEnd: cars.yearEnd,
      imageUrl: cars.imageUrl,
      isActive: cars.isActive,
    })
    .from(cars)
    .innerJoin(brands, eq(brands.id, cars.brandId))
    .orderBy(asc(brands.nameEn), asc(cars.model));
}

export async function getCarById(id: number) {
  return db.query.cars.findFirst({ where: (c, { eq }) => eq(c.id, id) });
}

// Full car rows for the owner cars manager (edit/delete needs brandId etc).
export async function getCarsFull() {
  return db.select().from(cars).orderBy(asc(cars.nameEn));
}

export async function getAllCarSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: cars.slug }).from(cars);
  return rows.map((r) => r.slug);
}

// Cars + whether each already has an air-kit fitment (so the air-kit assign
// form can offer only cars without a kit — one kit per car).
export async function getCarsForAirKitAssign() {
  return db
    .select({
      id: cars.id,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      slug: cars.slug,
      hasAirKit: sql<boolean>`${airKitFitments.id} is not null`,
    })
    .from(cars)
    .innerJoin(brands, eq(brands.id, cars.brandId))
    .leftJoin(airKitFitments, eq(airKitFitments.carId, cars.id))
    .orderBy(asc(brands.nameEn), asc(cars.model));
}

// All cars (for the coilover assign dropdown — many coilovers per car allowed).
export async function getCarsForCoiloverAssign() {
  return db
    .select({
      id: cars.id,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      slug: cars.slug,
    })
    .from(cars)
    .innerJoin(brands, eq(brands.id, cars.brandId))
    .orderBy(asc(brands.nameEn), asc(cars.model));
}

// What's attached to a car (for delete protection).
export async function getCarAttachments(
  carId: number
): Promise<{ airKits: number; coilovers: number }> {
  const [ak] = await db
    .select({ n: count() })
    .from(airKitFitments)
    .where(eq(airKitFitments.carId, carId));
  const [co] = await db
    .select({ n: count() })
    .from(coiloverFitments)
    .where(eq(coiloverFitments.carId, carId));
  return { airKits: Number(ak?.n ?? 0), coilovers: Number(co?.n ?? 0) };
}

// ── Air kits (customer-facing) ──────────────────────────────────────

// Cars that have an air kit fitted (the air-kit picker). Brand fields drive the
// make → model filter. Owner views pass includeInactive to also surface
// deactivated fitments/kits (badged).
async function getAirKitCarsImpl(includeInactive = false) {
  const columns = {
    id: cars.id,
    slug: cars.slug,
    brandEn: brands.nameEn,
    brandAr: brands.nameAr,
    model: cars.model,
    nameEn: cars.nameEn,
    nameAr: cars.nameAr,
    imageUrl: sql<string | null>`coalesce(${airKits.imageUrl}, ${cars.imageUrl})`,
    yearStart: cars.yearStart,
    yearEnd: cars.yearEnd,
  };
  // Owner view: show ALL active cars (left join) so a newly-added car with no
  // kit yet is still reachable to assign one. Customers only see cars with a
  // live, purchasable air kit (inner join + active filters).
  if (includeInactive) {
    return db
      .select(columns)
      .from(cars)
      .innerJoin(brands, eq(brands.id, cars.brandId))
      .leftJoin(airKitFitments, eq(airKitFitments.carId, cars.id))
      .leftJoin(airKits, eq(airKits.id, airKitFitments.airKitId))
      .where(eq(cars.isActive, true))
      .orderBy(asc(brands.nameEn), asc(cars.model));
  }
  return db
    .select(columns)
    .from(cars)
    .innerJoin(brands, eq(brands.id, cars.brandId))
    .innerJoin(airKitFitments, eq(airKitFitments.carId, cars.id))
    .innerJoin(airKits, eq(airKits.id, airKitFitments.airKitId))
    .where(
      and(
        eq(cars.isActive, true),
        eq(airKitFitments.isActive, true),
        eq(airKits.isActive, true)
      )
    )
    .orderBy(asc(brands.nameEn), asc(cars.model));
}
export const getAirKitCars = cached("getAirKitCars", getAirKitCarsImpl);

// A car + its fitted air kit (setups = shared features) + that car's prices.
async function getAirKitByCarSlugImpl(slug: string) {
  return db.query.cars.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      brand: true,
      airKitFitment: {
        with: {
          airKit: { with: { setups: true } },
          prices: true,
        },
      },
    },
  });
}
export const getAirKitByCarSlug = cached("getAirKitByCarSlug", getAirKitByCarSlugImpl);

// All air-kit product lines with their setups (owner list + assign picker).
export async function getAirKits() {
  return db.query.airKits.findMany({
    with: { setups: true },
    orderBy: (a, { asc }) => asc(a.titleEn),
  });
}

export async function getAirKitById(id: number) {
  return db.query.airKits.findFirst({
    where: (a, { eq }) => eq(a.id, id),
    with: { setups: true },
  });
}

// A kit's current fitments (which cars + their prices) for the owner.
export async function getAirKitFitments(airKitId: number) {
  return db
    .select({
      fitmentId: airKitFitments.id,
      carId: airKitFitments.carId,
      carNameEn: cars.nameEn,
      carNameAr: cars.nameAr,
      isActive: airKitFitments.isActive,
    })
    .from(airKitFitments)
    .innerJoin(cars, eq(cars.id, airKitFitments.carId))
    .where(eq(airKitFitments.airKitId, airKitId))
    .orderBy(asc(cars.nameEn));
}

// ── Coilovers (customer-facing) ─────────────────────────────────────

// Cars that have at least one active coilover fitted (the coilover picker).
async function getCoiloverCarsImpl(includeInactive = false) {
  const columns = {
    id: cars.id,
    slug: cars.slug,
    brandEn: brands.nameEn,
    brandAr: brands.nameAr,
    model: cars.model,
    nameEn: cars.nameEn,
    nameAr: cars.nameAr,
    imageUrl: sql<string | null>`coalesce(${cars.imageUrl}, min(${coilovers.imageUrl}))`,
    yearStart: cars.yearStart,
    yearEnd: cars.yearEnd,
  };
  // Owner view: show ALL active cars (left join) so a newly-added car with no
  // coilover yet is still reachable to assign one. Customers only see cars with
  // at least one live coilover (inner join + active filters).
  const base = includeInactive
    ? db
        .select(columns)
        .from(cars)
        .innerJoin(brands, eq(brands.id, cars.brandId))
        .leftJoin(coiloverFitments, eq(coiloverFitments.carId, cars.id))
        .leftJoin(coilovers, eq(coilovers.id, coiloverFitments.coiloverId))
        .where(eq(cars.isActive, true))
    : db
        .select(columns)
        .from(cars)
        .innerJoin(brands, eq(brands.id, cars.brandId))
        .innerJoin(coiloverFitments, eq(coiloverFitments.carId, cars.id))
        .innerJoin(coilovers, eq(coilovers.id, coiloverFitments.coiloverId))
        .where(
          and(
            eq(cars.isActive, true),
            eq(coiloverFitments.isActive, true),
            eq(coilovers.isActive, true)
          )
        );
  return base
    .groupBy(
      cars.id,
      cars.slug,
      brands.nameEn,
      brands.nameAr,
      cars.model,
      cars.nameEn,
      cars.nameAr,
      cars.imageUrl,
      cars.yearStart,
      cars.yearEnd
    )
    .orderBy(asc(brands.nameEn), asc(cars.model));
}
export const getCoiloverCars = cached("getCoiloverCars", getCoiloverCarsImpl);

// A car + its coilover fitments (each = a purchasable coilover at a price).
async function getCoiloversByCarSlugImpl(slug: string) {
  return db.query.cars.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      brand: true,
      coiloverFitments: {
        with: { coilover: true },
      },
    },
  });
}
export const getCoiloversByCarSlug = cached(
  "getCoiloversByCarSlug",
  getCoiloversByCarSlugImpl
);

// All coilover products (owner list + assign picker).
export async function getCoilovers() {
  return db.select().from(coilovers).orderBy(asc(coilovers.brand));
}

export async function getCoiloverById(id: number) {
  return db.query.coilovers.findFirst({ where: (c, { eq }) => eq(c.id, id) });
}

// A coilover's current fitments (which cars + prices) for the owner.
export async function getCoiloverFitments(coiloverId: number) {
  return db
    .select({
      fitmentId: coiloverFitments.id,
      carId: coiloverFitments.carId,
      carNameEn: cars.nameEn,
      carNameAr: cars.nameAr,
      pricePiastres: coiloverFitments.pricePiastres,
      isActive: coiloverFitments.isActive,
    })
    .from(coiloverFitments)
    .innerJoin(cars, eq(cars.id, coiloverFitments.carId))
    .where(eq(coiloverFitments.coiloverId, coiloverId))
    .orderBy(asc(cars.nameEn));
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

export async function getRimFilterOptions() {
  const where = eq(rims.isActive, true);

  const [diameters, widths, boltPatterns, offsets, finishes] =
    await Promise.all([
      db.selectDistinct({ v: rims.diameterInches }).from(rims).where(where).orderBy(asc(rims.diameterInches)),
      db.selectDistinct({ v: rims.widthInches }).from(rims).where(where).orderBy(asc(rims.widthInches)),
      db.selectDistinct({ v: rims.boltPattern }).from(rims).where(where).orderBy(asc(rims.boltPattern)),
      db.selectDistinct({ v: rims.offsetMm }).from(rims).where(where).orderBy(asc(rims.offsetMm)),
      db.selectDistinct({ v: rims.finish }).from(rims).where(where).orderBy(asc(rims.finish)),
    ]);

  return {
    diameters: diameters.map((r) => r.v),
    widths: widths.map((r) => r.v),
    boltPatterns: boltPatterns.map((r) => r.v),
    offsets: offsets.map((r) => r.v),
    finishes: finishes.map((r) => r.v),
  };
}

export async function getRimById(id: number) {
  return db.query.rims.findFirst({ where: (r, { eq }) => eq(r.id, id) });
}

// ── Revenue (owner-only) ────────────────────────────────────────────

export async function getRevenueSummary() {
  const [row] = await db
    .select({
      totalPiastres: sql<number>`coalesce(sum(${orders.subtotalPiastres}), 0)`,
      paidOrders: count(orders.id),
    })
    .from(orders)
    .where(sql`${orders.status} in ('deposit_paid','balance_paid','completed')`);

  return {
    totalPiastres: Number(row?.totalPiastres ?? 0),
    paidOrders: Number(row?.paidOrders ?? 0),
  };
}

// ── Builds gallery ──────────────────────────────────────────────────

async function getActiveBuildsImpl() {
  return db
    .select()
    .from(builds)
    .where(eq(builds.isActive, true))
    .orderBy(asc(builds.sortOrder), desc(builds.createdAt));
}
export const getActiveBuilds = cached("getActiveBuilds", getActiveBuildsImpl);

export async function getAllBuilds() {
  return db.select().from(builds).orderBy(asc(builds.sortOrder), desc(builds.createdAt));
}

export async function getBuildById(id: number) {
  return db.query.builds.findFirst({ where: (b, { eq }) => eq(b.id, id) });
}

// ── Owner "new booking" notification ────────────────────────────────

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

// A coilover product is "ordered" if any of its fitments appears in an order.
export async function coiloverHasOrders(coiloverId: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(orderItems)
    .innerJoin(
      coiloverFitments,
      eq(coiloverFitments.id, orderItems.coiloverFitmentId)
    )
    .where(eq(coiloverFitments.coiloverId, coiloverId));
  return Number(r?.n ?? 0) > 0;
}

// An air kit is "ordered" if any of its fitment prices appears in an order.
export async function airKitHasOrders(airKitId: number): Promise<boolean> {
  const [r] = await db
    .select({ n: count() })
    .from(orderItems)
    .innerJoin(
      airKitFitmentPrices,
      eq(airKitFitmentPrices.id, orderItems.airKitFitmentPriceId)
    )
    .innerJoin(
      airKitFitments,
      eq(airKitFitments.id, airKitFitmentPrices.fitmentId)
    )
    .where(eq(airKitFitments.airKitId, airKitId));
  return Number(r?.n ?? 0) > 0;
}

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
    .selectDistinct({ id: coiloverFitments.coiloverId })
    .from(orderItems)
    .innerJoin(
      coiloverFitments,
      eq(coiloverFitments.id, orderItems.coiloverFitmentId)
    )
    .where(inArray(coiloverFitments.coiloverId, ids));
  return new Set(rows.map((r) => r.id).filter((x): x is number => x != null));
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
  return db.select().from(carRequests).orderBy(desc(carRequests.createdAt));
}

export type { SetupType };
