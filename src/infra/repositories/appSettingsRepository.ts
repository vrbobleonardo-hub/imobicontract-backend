import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAppSettings = async () => {
  const existing = await prisma.appSettings.findFirst();
  if (existing) return existing;
  return prisma.appSettings.create({
    data: { id: 1, singleton: true },
  });
};

export const updateAppSettings = async (data: Partial<import('@prisma/client').AppSettings>) => {
  await getAppSettings();
  return prisma.appSettings.update({
    where: { id: 1 },
    data,
  });
};
