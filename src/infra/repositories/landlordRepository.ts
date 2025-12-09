import { prisma } from '../db/client';
import { Contract } from '../../domain/types';
import { PersonInput } from './tenantRepository';

function mapLandlord(landlord: any) {
  const contracts =
    landlord.contracts?.map((c: { contract: Contract }) => ({
      id: c.contract.id,
      titulo: c.contract.titulo,
      endereco: c.contract.endereco,
      status: c.contract.status,
      tipo: c.contract.tipo,
      criadoEm: c.contract.criadoEm,
    })) || [];

  return {
    ...landlord,
    name: landlord.fullName, // compat
    contracts,
  };
}

export async function createLandlord(userId: number, data: PersonInput) {
  return prisma.landlord.create({ data: { ...data, userId } });
}

export async function updateLandlord(userId: number, id: string, data: PersonInput) {
  const exists = await prisma.landlord.findFirst({ where: { id, userId } });
  if (!exists) return null;
  return prisma.landlord.update({
    where: { id },
    data,
  });
}

export async function deleteLandlord(userId: number, id: string) {
  const landlord = await prisma.landlord.findFirst({ where: { id, userId } });
  if (!landlord) return null;

  const hasContracts = await prisma.contractLandlord.count({
    where: { landlordId: id, contract: { userId } },
  });
  if (hasContracts > 0) {
    return prisma.landlord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  return prisma.landlord.delete({ where: { id } });
}

export async function findLandlordById(userId: number, id: string) {
  const landlord = await prisma.landlord.findFirst({
    where: { id, userId },
    include: { contracts: { include: { contract: true } } },
  });
  if (!landlord || landlord.deletedAt) return null;
  return mapLandlord(landlord);
}

export async function listLandlords(userId: number, q?: string) {
  const contains = q ? ({ contains: q, mode: 'insensitive' as const }) : undefined;
  const list = await prisma.landlord.findMany({
    where: {
      deletedAt: null,
      userId,
      ...(contains
        ? {
            OR: [{ fullName: contains }, { email: contains }, { cpf: contains }],
          }
        : {}),
    },
    include: { contracts: { include: { contract: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return list.map(mapLandlord);
}
