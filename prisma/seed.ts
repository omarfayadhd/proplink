import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const users = [
    { email: "admin@proplink.test", name: "Platform Admin", role: Role.ADMIN },
    { email: "agent@proplink.test", name: "Alice Agent", role: Role.AGENT },
    { email: "investor@proplink.test", name: "Ivan Investor", role: Role.INVESTOR },
    { email: "buyer@proplink.test", name: "Bella Buyer", role: Role.BUYER },
  ];

  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        ...u,
        passwordHash,
        emailVerified: new Date(),
        gdprConsentAt: new Date(),
      },
    });
  }

  const agent = await db.user.findUniqueOrThrow({
    where: { email: "agent@proplink.test" },
  });

  const profiles = [
    { agencyName: "Northgate Distressed Assets", complianceCode: "PL-AG-0001" },
    { agencyName: "Mercia Probate Properties", complianceCode: "PL-AG-0002" },
    { agencyName: "Thames Valley Renovations", complianceCode: "PL-AG-0003" },
  ];

  for (const p of profiles) {
    await db.agentProfile.upsert({
      where: { complianceCode: p.complianceCode },
      update: {},
      create: {
        ...p,
        userId: agent.id,
        bio: `${p.agencyName} — distressed stock specialists.`,
      },
    });
  }

  console.log(`Seeded ${users.length} users and ${profiles.length} agent profiles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
