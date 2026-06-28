import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Standalone migration runner (separate connection, max:1) so it can run
// from the CLI against Neon. Usage: npm run db:migrate
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");

  const migrationClient = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await migrationClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
