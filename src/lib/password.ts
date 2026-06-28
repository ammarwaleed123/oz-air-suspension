import "server-only";
import bcrypt from "bcryptjs";

// Password hashing via bcrypt (cost factor 12). Centralized so the cost and
// algorithm live in one place.
const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
