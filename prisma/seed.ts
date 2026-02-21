import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      zohoOrgId: process.env.ZOHO_ORG_ID || "",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
      aiModel: "claude-sonnet-4-20250514",
      aiTemperature: 0.3,
      cacheMinutes: 15,
      currency: "USD",
      fiscalYearStart: "01",
    },
  });

  console.log("Default settings created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
