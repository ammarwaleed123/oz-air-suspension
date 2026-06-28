import "server-only";
import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";
import { db } from "./client";
import { airKits, cars, coilovers, orders, rims } from "./schema";
import type { SetupType } from "@/lib/catalog";

// All catalog reads live here so pages stay thin and queries stay efficient
// (relational `with` clauses batch their joins — no N+1 from the page layer).

// ── Air kits ────────────────────────────────────────────────────────

// Cars that have an active air kit (the air-kit car picker). The card image
// prefers the air kit's own image, falling back to the car's.
export async function getAirKitCars() {
  return db
    .select({
      id: cars.id,
      slug: cars.slug,
      nameEn: cars.nameEn,
      nameAr: cars.nameAr,
      imageUrl: sql<string | null>`coalesce(${airKits.imageUrl}, ${cars.imageUrl})`,
      yearStart: cars.yearStart,
      yearEnd: cars.yearEnd,
    })
    .from(cars)
    .innerJoin(airKits, eq(airKits.carId, cars.id))
    .where(and(eq(cars.isActive, true), eq(airKits.isActive, true)))
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

// A car with its coilovers, newest manufacture date first.
export async function getCoiloversByCarSlug(slug: string) {
  return db.query.cars.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    with: {
      coilovers: {
        where: (co, { eq }) => eq(co.isActive, true),
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

export async function getRims(filters: RimFilters) {
  const conditions: SQL[] = [eq(rims.isActive, true)];

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

export type { SetupType };
