import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Convert EGP to piastres (1 EGP = 100 piastres).
const egp = (pounds: number) => pounds * 100;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");

  const client = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding sample catalog…");

  // ── A sample car ──────────────────────────────────────────────────
  const [car] = await db
    .insert(schema.cars)
    .values({
      slug: "mercedes-c-class-w205",
      make: "Mercedes",
      model: "C-Class W205",
      nameEn: "Mercedes C-Class (W205)",
      nameAr: "مرسيدس C-Class (W205)",
      yearStart: 2014,
      yearEnd: 2021,
    })
    .returning();

  // ── Its single air kit + four PARALLEL setups ────────────────────
  const [kit] = await db
    .insert(schema.airKits)
    .values({
      carId: car.id,
      titleEn: "Air Suspension Kit — Mercedes C-Class W205",
      titleAr: "طقم تعليق هوائي — مرسيدس C-Class W205",
      descriptionEn: "Complete bolt-on air suspension kit for the W205.",
      descriptionAr: "طقم تعليق هوائي كامل وجاهز للتركيب على W205.",
      imageUrl: "https://picsum.photos/seed/airkit-w205/800/450",
    })
    .returning();

  await db.insert(schema.airKitSetups).values([
    {
      airKitId: kit.id,
      setupType: "low_normal_slow",
      pricePiastres: egp(55000),
      featuresEn: ["Front + rear air struts", "Manual paddle controller", "Normal fill speed"],
      featuresAr: ["مساعدات هوائية أمامية وخلفية", "تحكم يدوي بالباول", "سرعة نفخ عادية"],
    },
    {
      airKitId: kit.id,
      setupType: "low_fast",
      pricePiastres: egp(75000),
      featuresEn: ["Front + rear air struts", "Fast-fill compressor", "Quick rise/drop"],
      featuresAr: ["مساعدات هوائية أمامية وخلفية", "كمبروسر نفخ سريع", "رفع/تنزيل سريع"],
    },
    {
      airKitId: kit.id,
      setupType: "down_dual",
      pricePiastres: egp(70000),
      featuresEn: ["Lowered ride height", "Dual compressor setup", "Digital management"],
      featuresAr: ["ارتفاع منخفض", "كمبروسر مزدوج", "إدارة رقمية"],
    },
    {
      airKitId: kit.id,
      setupType: "down_single",
      pricePiastres: egp(85000),
      featuresEn: ["Maximum drop", "Single high-output compressor", "Presets + smartphone control"],
      featuresAr: ["أقصى انخفاض", "كمبروسر مفرد عالي الأداء", "أوضاع مسبقة وتحكم بالموبايل"],
    },
  ]);

  // ── Several coilovers for the same car ───────────────────────────
  await db.insert(schema.coilovers).values([
    {
      carId: car.id,
      brand: "BC Racing",
      manufactureDate: "2024-03-01",
      pricePiastres: egp(48000),
      descriptionEn: "BC Racing BR series, 30-way adjustable.",
      descriptionAr: "BC Racing سلسلة BR، قابلة للتعديل 30 درجة.",
      imageUrl: "https://picsum.photos/seed/coilover-bc/600/450",
    },
    {
      carId: car.id,
      brand: "KW",
      manufactureDate: "2023-11-01",
      pricePiastres: egp(82000),
      descriptionEn: "KW Variant 3, inox-line.",
      descriptionAr: "KW Variant 3، خط إينوكس.",
      imageUrl: "https://picsum.photos/seed/coilover-kw/600/450",
    },
  ]);

  // ── Standalone rims (no car link) ────────────────────────────────
  await db.insert(schema.rims).values([
    {
      nameEn: "Vossen CV3 19\"",
      nameAr: "فوسن CV3 مقاس 19",
      diameterInches: 19,
      widthInches: "8.5",
      boltPattern: "5x112",
      offsetMm: 35,
      finish: "Gloss Black",
      pricePiastres: egp(60000),
      stock: 4,
      imageUrl: "https://picsum.photos/seed/rim-vossen/600/450",
    },
    {
      nameEn: "BBS LM 18\"",
      nameAr: "BBS LM مقاس 18",
      diameterInches: 18,
      widthInches: "8.0",
      boltPattern: "5x112",
      offsetMm: 42,
      finish: "Diamond Silver",
      pricePiastres: egp(72000),
      stock: 2,
      imageUrl: "https://picsum.photos/seed/rim-bbs/600/450",
    },
  ]);

  // ── Sample builds gallery (placeholder images) ───────────────────
  await db.insert(schema.builds).values([
    {
      imageUrl: "https://picsum.photos/seed/build-w205/800/1000",
      year: 2023,
      titleEn: "Mercedes C-Class W205",
      titleAr: "مرسيدس C-Class W205",
      sortOrder: 0,
    },
    {
      imageUrl: "https://picsum.photos/seed/build-golf/800/1000",
      year: 2022,
      titleEn: "Volkswagen Golf GTI",
      titleAr: "فولكس فاجن جولف GTI",
      sortOrder: 1,
    },
    {
      imageUrl: "https://picsum.photos/seed/build-bmw/800/1000",
      year: 2024,
      titleEn: "BMW 3-Series F30",
      titleAr: "بي إم دبليو الفئة الثالثة F30",
      sortOrder: 2,
    },
  ]);

  console.log("Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
