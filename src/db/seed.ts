import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import type { SetupType } from "@/lib/catalog";

const egp = (pounds: number) => pounds * 100;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");

  const client = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding sample catalog…");

  // ── Brands (stored once) ──────────────────────────────────────────
  const [vw, merc] = await db
    .insert(schema.brands)
    .values([
      { slug: "volkswagen", nameEn: "Volkswagen", nameAr: "فولكس فاجن" },
      { slug: "mercedes", nameEn: "Mercedes", nameAr: "مرسيدس" },
    ])
    .returning();

  // ── Cars (brand + model + year range). nameEn/nameAr = brand + model. ──
  const [golf5, golf6, cclass] = await db
    .insert(schema.cars)
    .values([
      { slug: "volkswagen-golf-5", brandId: vw.id, model: "Golf 5", nameEn: "Volkswagen Golf 5", nameAr: "فولكس فاجن Golf 5", yearStart: 2005, yearEnd: 2009 },
      { slug: "volkswagen-golf-6", brandId: vw.id, model: "Golf 6", nameEn: "Volkswagen Golf 6", nameAr: "فولكس فاجن Golf 6", yearStart: 2009, yearEnd: 2013 },
      { slug: "mercedes-c-class-w205", brandId: merc.id, model: "C-Class W205", nameEn: "Mercedes C-Class W205", nameAr: "مرسيدس C-Class W205", yearStart: 2014, yearEnd: 2021 },
    ])
    .returning();

  // Shared feature lists for the four setups (same across every fitted car).
  const setupFeatures: Record<SetupType, { en: string[]; ar: string[] }> = {
    low_normal_slow: { en: ["Front + rear air struts", "Manual paddle controller", "Normal fill speed"], ar: ["مساعدات هوائية أمامية وخلفية", "تحكم يدوي بالباول", "سرعة نفخ عادية"] },
    low_fast: { en: ["Front + rear air struts", "Fast-fill compressor", "Quick rise / drop"], ar: ["مساعدات هوائية أمامية وخلفية", "كمبروسر نفخ سريع", "رفع / تنزيل سريع"] },
    down_dual: { en: ["Lowered ride height", "Dual compressor setup", "Digital management"], ar: ["ارتفاع منخفض", "كمبروسر مزدوج", "إدارة رقمية"] },
    down_single: { en: ["Maximum drop", "Single high-output compressor", "Presets + smartphone control"], ar: ["أقصى انخفاض", "كمبروسر مفرد عالي الأداء", "أوضاع مسبقة وتحكم بالموبايل"] },
  };
  const SETUPS: SetupType[] = ["low_normal_slow", "low_fast", "down_dual", "down_single"];

  async function addAirKitSetups(airKitId: number) {
    await db.insert(schema.airKitSetups).values(
      SETUPS.map((t) => ({
        airKitId,
        setupType: t,
        featuresEn: setupFeatures[t].en,
        featuresAr: setupFeatures[t].ar,
      }))
    );
  }
  // Assign a kit to a car with that car's four prices (in EGP thousands).
  async function fitAirKit(airKitId: number, carId: number, prices: Record<SetupType, number>) {
    const [fit] = await db
      .insert(schema.airKitFitments)
      .values({ airKitId, carId })
      .returning();
    await db.insert(schema.airKitFitmentPrices).values(
      SETUPS.map((t) => ({ fitmentId: fit.id, setupType: t, pricePiastres: egp(prices[t]) }))
    );
  }

  // Air kit A — fits BOTH Golf 5 and Golf 6 (shared features, different prices).
  const [kitGolf] = await db
    .insert(schema.airKits)
    .values({
      titleEn: "OZ Air — Performance Air Suspension",
      titleAr: "OZ Air — تعليق هوائي للأداء",
      descriptionEn: "Complete bolt-on air suspension. Four setups.",
      descriptionAr: "طقم تعليق هوائي كامل وجاهز للتركيب. أربع تجهيزات.",
      imageUrl: "https://picsum.photos/seed/airkit-golf/800/450",
    })
    .returning();
  await addAirKitSetups(kitGolf.id);
  await fitAirKit(kitGolf.id, golf5.id, { low_normal_slow: 52000, low_fast: 71000, down_dual: 66000, down_single: 80000 });
  await fitAirKit(kitGolf.id, golf6.id, { low_normal_slow: 55000, low_fast: 74000, down_dual: 69000, down_single: 84000 });

  // Air kit B — fits the C-Class.
  const [kitMerc] = await db
    .insert(schema.airKits)
    .values({
      titleEn: "OZ Air — Executive Air Suspension",
      titleAr: "OZ Air — تعليق هوائي للسيارات الفاخرة",
      imageUrl: "https://picsum.photos/seed/airkit-w205/800/450",
    })
    .returning();
  await addAirKitSetups(kitMerc.id);
  await fitAirKit(kitMerc.id, cclass.id, { low_normal_slow: 62000, low_fast: 84000, down_dual: 78000, down_single: 96000 });

  // ── Coilovers (products fitted to one-or-more cars, price per car) ──
  async function fitCoilover(coiloverId: number, carId: number, priceK: number) {
    await db.insert(schema.coiloverFitments).values({ coiloverId, carId, pricePiastres: egp(priceK) });
  }
  const [bc] = await db
    .insert(schema.coilovers)
    .values({ brand: "BC Racing", manufactureDate: "2024-03-01", descriptionEn: "BC Racing BR series, 30-way adjustable.", descriptionAr: "BC Racing سلسلة BR، قابلة للتعديل 30 درجة.", imageUrl: "https://picsum.photos/seed/coilover-bc/600/450" })
    .returning();
  await fitCoilover(bc.id, golf5.id, 44000);
  await fitCoilover(bc.id, golf6.id, 46000);
  await fitCoilover(bc.id, cclass.id, 52000);

  const [kw] = await db
    .insert(schema.coilovers)
    .values({ brand: "KW", manufactureDate: "2023-11-01", descriptionEn: "KW Variant 3, inox-line.", descriptionAr: "KW Variant 3، خط إينوكس.", imageUrl: "https://picsum.photos/seed/coilover-kw/600/450" })
    .returning();
  await fitCoilover(kw.id, cclass.id, 82000);

  // ── Standalone rims (no car link) ────────────────────────────────
  await db.insert(schema.rims).values([
    { nameEn: 'Vossen CV3 19"', nameAr: "فوسن CV3 مقاس 19", diameterInches: 19, widthInches: "8.5", boltPattern: "5x112", offsetMm: 35, finish: "Gloss Black", brand: "Vossen", pricePiastres: egp(60000), stock: 4, imageUrl: "https://picsum.photos/seed/rim-vossen/600/450" },
    { nameEn: 'BBS LM 18"', nameAr: "BBS LM مقاس 18", diameterInches: 18, widthInches: "8.0", boltPattern: "5x112", offsetMm: 42, finish: "Diamond Silver", brand: "BBS", pricePiastres: egp(72000), stock: 2, imageUrl: "https://picsum.photos/seed/rim-bbs/600/450" },
  ]);

  // ── Sample builds gallery (placeholder images) ───────────────────
  await db.insert(schema.builds).values([
    { imageUrl: "https://picsum.photos/seed/build-w205/800/1000", year: 2023, titleEn: "Mercedes C-Class W205", titleAr: "مرسيدس C-Class W205", sortOrder: 0 },
    { imageUrl: "https://picsum.photos/seed/build-golf/800/1000", year: 2022, titleEn: "Volkswagen Golf GTI", titleAr: "فولكس فاجن جولف GTI", sortOrder: 1 },
    { imageUrl: "https://picsum.photos/seed/build-bmw/800/1000", year: 2024, titleEn: "BMW 3-Series F30", titleAr: "بي إم دبليو الفئة الثالثة F30", sortOrder: 2 },
  ]);

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
