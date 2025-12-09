import { prisma } from '../db/client';

export type PropertyData = {
  title: string;
  address: string;
  city: string;
  state?: string | null;
  zipCode?: string | null;
  type?: string | null;
  status?: string | null;
  landlordName?: string | null;
  landlordContact?: string | null;
  notes?: string | null;
};

export async function getUserProperties(userId: number) {
  const result = await prisma.property.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return result;
}

export async function createUserProperty(userId: number, data: PropertyData) {
  return prisma.property.create({
    data: { ...data, userId },
  });
}

export async function updateUserProperty(userId: number, id: number, data: Partial<PropertyData>) {
  const exists = await prisma.property.findFirst({ where: { id, userId } });
  if (!exists) return null;
  const updated = await prisma.property.update({
    where: { id },
    data,
  });
  return updated;
}

export async function deleteUserProperty(userId: number, id: number) {
  const exists = await prisma.property.findFirst({ where: { id, userId } });
  if (!exists) return false;
  await prisma.property.delete({ where: { id } });
  return true;
}
