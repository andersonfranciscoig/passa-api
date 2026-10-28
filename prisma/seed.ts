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

  const defaultPlans = [
    {
      kind: "subscription",
      name: "PASSA Pro",
      description: "Estatísticas avançadas (90 dias, funil, público, horas de pico), efeito dos destaques e exportação.",
      durationDays: 30,
      priceAoa: 3500,
    },
    {
      kind: "promotion",
      name: "Destaque Básico",
      description: "3 dias na secção de destaques da página inicial.",
      durationDays: 3,
      priceAoa: 500,
    },
    {
      kind: "promotion",
      name: "Destaque Plus",
      description: "7 dias em destaque na página inicial e no topo dos resultados.",
      durationDays: 7,
      priceAoa: 1000,
    },
    {
      kind: "promotion",
      name: "Destaque Pro",
      description: "14 dias em destaque — ideal para artigos de valor mais alto.",
      durationDays: 14,
      priceAoa: 2000,
    },
  ] as const;

  for (const plan of defaultPlans) {
    const found = await prisma.monetizationPlan.findFirst({ where: { kind: plan.kind, name: plan.name } });
    if (found) continue;
    await prisma.monetizationPlan.create({
      data: {
        id: crypto.randomUUID(),
        kind: plan.kind,
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        priceAoa: plan.priceAoa,
        isActive: true,
      },
    });
  }

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
