import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function resolveDatabaseUrl(): string | undefined {
  if (process.env.VERCEL && !process.env.SEED_BUILD) {
    const tmpDbPath = "/tmp/dev.db";
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const bundledDbPath = path.join(process.cwd(), "prisma", "dev.db");
        if (fs.existsSync(bundledDbPath)) {
          fs.copyFileSync(bundledDbPath, tmpDbPath);
          fs.chmodSync(tmpDbPath, 0o666);
        }
      }
      return `file:${tmpDbPath}`;
    } catch {
      // Fallback to default
    }
  }
  return undefined;
}

const runtimeDbUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(runtimeDbUrl
      ? {
          datasources: {
            db: {
              url: runtimeDbUrl,
            },
          },
        }
      : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
