import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { or, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

// Secure, CLI-only way to create staff/owner accounts. Public signup can only
// ever create customers, so privileged roles MUST be created here by someone
// with database/server access.
//
// Usage:
//   npm run create:user -- <owner|staff> <email> <password> "<name>" <phone>

async function main() {
  const [role, email, password, name, phone] = process.argv.slice(2);

  if (!role || !email || !password || !name || !phone) {
    console.error(
      'Usage: npm run create:user -- <owner|staff> <email> <password> "<name>" <phone>'
    );
    process.exit(1);
  }
  if (role !== "owner" && role !== "staff") {
    console.error('Role must be "owner" or "staff" (customers self-register).');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example).");

  const client = postgres(url, { ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({
    where: or(
      eq(schema.users.email, normalizedEmail),
      eq(schema.users.phone, phone.trim())
    ),
  });
  if (existing) {
    console.error("A user with that email or phone already exists.");
    await client.end();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(schema.users)
    .values({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      role,
    })
    .returning({ id: schema.users.id, email: schema.users.email, role: schema.users.role });

  console.log(`Created ${user.role} account: ${user.email} (id ${user.id})`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
