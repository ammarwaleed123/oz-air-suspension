import type { DefaultSession } from "next-auth";

type AppRole = "customer" | "staff" | "owner";

// Extend the session/JWT to carry our numeric user id (as string) and role.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
