// src/infra/db/client.ts
import { PrismaClient } from '@prisma/client';

// Singleton do Prisma: um cliente único pro app todo
export const prisma = new PrismaClient();
