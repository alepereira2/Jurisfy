import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import os from 'os';

function getPrismaClient(): PrismaClient {
  const envUrl = process.env.DATABASE_URL;

  // 1. Se o usuário configurou PostgreSQL, Neon, Supabase na Vercel
  if (envUrl && (envUrl.startsWith('postgres') || envUrl.startsWith('mysql'))) {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  // 2. Se estiver na Vercel (onde o filesystem raiz é read-only e apenas tmpdir é gravável)
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join(os.tmpdir(), 'jurisfy.db');

    if (!fs.existsSync(tmpDbPath)) {
      const candidatePaths = [
        path.join(process.cwd(), 'prisma', 'jurisfy-seed.sqlite'),
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.resolve('./prisma/jurisfy-seed.sqlite'),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            fs.copyFileSync(p, tmpDbPath);
            break;
          } catch (err) {
            console.error('Falha ao copiar seed db:', err);
          }
        }
      }
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${tmpDbPath}`,
        },
      },
      log: ['error'],
    });
  }

  // 3. Desenvolvimento local padrão (Windows / Linux)
  const localDb = path.resolve(process.cwd(), 'prisma', 'dev.db');
  return new PrismaClient({
    datasources: {
      db: {
        url: `file:${localDb}`,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
