import type { KycStatus, Role } from "@/generated/prisma/enums";
import type { DefaultSession } from "next-auth";
// Anchor imports: without these, `declare module` below creates fresh ambient
// modules instead of AUGMENTING next-auth's types (silent type breakage).
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      kycStatus: KycStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    kycStatus?: KycStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role;
    kycStatus?: KycStatus;
  }
}
