import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/enums";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const providers = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await db.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user?.passwordHash || !user.active) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        kycStatus: user.kycStatus,
      };
    },
  }),
  // Google is optional until H1.6 delivers OAuth credentials (see docs/BLOCKERS.md).
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      // First Google sign-in provisions a BUYER account; Admin is seed-only.
      if (account?.provider === "google" && user.email) {
        await db.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: { emailVerified: new Date() },
          create: {
            email: user.email.toLowerCase(),
            name: user.name ?? user.email,
            role: Role.BUYER,
            emailVerified: new Date(),
            avatarUrl: user.image ?? null,
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.role) {
        token.uid = user.id;
        token.role = user.role;
        token.kycStatus = user.kycStatus;
      }
      // OAuth users: role/kycStatus live in the DB, not the provider profile.
      if (!token.role && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email.toLowerCase() },
        });
        if (dbUser) {
          token.uid = dbUser.id;
          token.role = dbUser.role;
          token.kycStatus = dbUser.kycStatus;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      if (token.role) session.user.role = token.role;
      if (token.kycStatus) session.user.kycStatus = token.kycStatus;
      return session;
    },
  },
});
