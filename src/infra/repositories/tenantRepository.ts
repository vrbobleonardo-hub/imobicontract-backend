import { prisma } from '../db/client';
import { Contract } from '../../domain/types';

export type PersonInput = {
  fullName: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  nationality: string;
  profession: string;
  maritalStatus: string;
  maritalRegime?: string;
  spouseName?: string;
  spouseCpf?: string;
  spouseRg?: string;
  isUnionStable?: boolean;
  email?: string;
  phone?: string;
  address: string;
};

function mapTenant(tenant: any) {
  const contracts =
    tenant.contracts?.map((c: { contract: Contract }) => ({
      id: c.contract.id,
      titulo: c.contract.titulo,
      endereco: c.contract.endereco,
      status: c.contract.status,
      tipo: c.contract.tipo,
      criadoEm: c.contract.criadoEm,
    })) || [];

  return {
    ...tenant,
    name: tenant.fullName, // compat
    contracts,
  };
}

export async function createTenant(userId: number, data: PersonInput) {
  return prisma.tenant.create({ data: { ...data, userId } });
}

export async function updateTenant(userId: number, id: string, data: PersonInput) {
  const exists = await prisma.tenant.findFirst({ where: { id, userId } });
  if (!exists) return null;
  return prisma.tenant.update({
    where: { id },
    data,
  });
}

export async function deleteTenant(userId: number, id: string) {
  const tenant = await prisma.tenant.findFirst({ where: { id, userId } });
  if (!tenant) return null;

  const hasContracts = await prisma.contractTenant.count({
    where: { tenantId: id, contract: { userId } },
  });
  if (hasContracts > 0) {
    return prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
  return prisma.tenant.delete({ where: { id } });
}

export async function findTenantById(userId: number, id: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id, userId },
    include: { contracts: { include: { contract: true } } },
  });
  if (!tenant || tenant.deletedAt) return null;
  return mapTenant(tenant);
}

export async function listTenants(userId: number, q?: string) {
  const contains = q ? ({ contains: q, mode: 'insensitive' as const }) : undefined;
  const list = await prisma.tenant.findMany({
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
  return list.map(mapTenant);
}
