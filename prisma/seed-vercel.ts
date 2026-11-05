process.env.SEED_BUILD = "1";

import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { expandCatalogAndRebalanceCases } from "../src/lib/rebalance";

const prisma = new PrismaClient();

async function main() {
  const skinCount = await prisma.skin.count().catch(() => 0);
  if (skinCount < 100) {
    console.log("Seeding base CS2 database for production...");
    execSync("npx tsx prisma/seed.ts", {
      stdio: "inherit",
      env: { ...process.env, SEED_BUILD: "1" },
    });
  }
  console.log("Expanding catalog to 2,380+ skins and 84 cases...");
  const result = await expandCatalogAndRebalanceCases();
  console.log("Database ready:", result);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
