import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Paste your Neon connection string into .env (see .env.example)."
  );
}

// Neon requires SSL. postgres-js handles pooling; we keep a single client
// instance across hot reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  __ozClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__ozClient ??
  postgres(connectionString, { ssl: "require", prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ozClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
