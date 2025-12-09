import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { Contract, ContractFilters, PersonSummary } from '../../domain/types';

type ContractCreateInput = {
  titulo?: string;
  endereco?: string;
  tipo?: string;
  status?: string;
  startDate: string;
  endDate: string;
  rentValue: number;
  condoValue?: number;
  iptuValue?: number;
  depositValue?: number;
  dueDay: number;
  city: string;
  state: string;
  fullAddress: string;
  propertyDescription?: string;
  landlordIds: string[];
  tenantIds: string[];
  generatedText?: string;
};

function mapContractParties(dbContract: any): { landlords: PersonSummary[]; tenants: PersonSummary[] } {
  const landlords =
    dbContract.contractLandlords?.map((cl: any) => ({
      id: cl.landlord.id,
      fullName: cl.landlord.fullName,
      cpf: cl.landlord.cpf,
      email: cl.landlord.email,
      phone: cl.landlord.phone,
    })) || [];

  const tenants =
    dbContract.contractTenants?.map((ct: any) => ({
      id: ct.tenant.id,
      fullName: ct.tenant.fullName,
      cpf: ct.tenant.cpf,
      email: ct.tenant.email,
      phone: ct.tenant.phone,
    })) || [];

  return { landlords, tenants };
}

function mapContract(db: any): Contract {
  const parties = mapContractParties(db);
  return {
    id: db.id,
    titulo: db.titulo,
    endereco: db.endereco,
    tipo: db.tipo,
    status: db.status,
    criadoEm: (db.criadoEm ?? db.createdAt)?.toISOString?.() ?? db.criadoEm ?? db.createdAt,
    startDate: db.startDate?.toISOString?.() ?? db.startDate,
    endDate: db.endDate?.toISOString?.() ?? db.endDate,
    rentValue: db.rentValue ?? undefined,
    condoValue: db.condoValue ?? undefined,
    iptuValue: db.iptuValue ?? undefined,
    depositValue: db.depositValue ?? undefined,
    dueDay: db.dueDay ?? undefined,
    city: db.city,
    state: db.state,
    fullAddress: db.fullAddress,
    propertyDescription: db.propertyDescription,
    generatedText: db.generatedText,
    ...parties,
  };
}

export async function findContracts(userId: number, filters: ContractFilters): Promise<Contract[]> {
  const where: any = { userId };

  if (filters.status && filters.status !== 'todos') {
    where.status = filters.status;
  }
  if (filters.tipo && filters.tipo !== 'todos') {
    where.tipo = filters.tipo;
  }
  if (filters.q) {
    const term = filters.q.toLowerCase();
    where.OR = [
      { titulo: { contains: term, mode: 'insensitive' } },
      { endereco: { contains: term, mode: 'insensitive' } },
      { fullAddress: { contains: term, mode: 'insensitive' } },
    ];
  }

  const result = await prisma.contract.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    include: {
      contractLandlords: { include: { landlord: true } },
      contractTenants: { include: { tenant: true } },
    },
  });

  return result.map(mapContract);
}

export async function createContractRecord(
  userId: number,
  data: ContractCreateInput,
  tx?: Prisma.TransactionClient
): Promise<Contract> {
  const client = tx ?? prisma;
  const created = await client.contract.create({
    data: {
      userId,
      titulo: data.titulo || `Contrato de locação - ${data.city}/${data.state}`,
      endereco: data.endereco || data.fullAddress,
      tipo: data.tipo || 'residencial',
      status: data.status || 'ativo',
      criadoEm: new Date(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      rentValue: Math.round(data.rentValue),
      condoValue: Math.round(data.condoValue ?? 0),
      iptuValue: Math.round(data.iptuValue ?? 0),
      depositValue: Math.round(data.depositValue ?? 0),
      dueDay: data.dueDay,
      city: data.city,
      state: data.state,
      fullAddress: data.fullAddress,
      propertyDescription: data.propertyDescription,
      generatedText: data.generatedText,
      contractLandlords: {
        create: data.landlordIds.map((landlordId) => ({ landlordId })),
      },
      contractTenants: {
        create: data.tenantIds.map((tenantId) => ({ tenantId })),
      },
    },
    include: {
      contractLandlords: { include: { landlord: true } },
      contractTenants: { include: { tenant: true } },
    },
  });

  return mapContract(created);
}
