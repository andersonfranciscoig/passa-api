import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env antes de correr o seed.");
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      id: crypto.randomUUID(),
      email: adminEmail,
      passwordHash: await hash(adminPassword, 10),
      displayName: "Equipa PASSA",
      province: "Luanda",
      municipality: "Ingombota",
      role: "ADMIN",
    },
    update: {
      passwordHash: await hash(adminPassword, 10),
      displayName: "Equipa PASSA",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  await prisma.betaSettings.upsert({
    where: { id: true },
    create: { id: true, closedBeta: true },
    update: {},
  });

  await prisma.monetizationSettings.upsert({
    where: { id: true },
    create: { id: true },
    update: {},
  });

  console.log(`Seed OK. Única conta: ${adminEmail} (ADMIN)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
