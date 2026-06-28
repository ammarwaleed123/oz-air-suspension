import { handlers } from "@/auth";

// Auth.js route handlers. authorize() uses bcrypt, so this must run on the
// Node.js runtime (not edge).
export const runtime = "nodejs";
export const { GET, POST } = handlers;
