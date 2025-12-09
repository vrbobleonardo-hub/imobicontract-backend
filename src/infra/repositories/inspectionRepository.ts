import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import { Inspection, InspectionFilters } from '../../domain/types';

function mapInspection(db: any): Inspection {
  let aiJson: any = db.aiJson ?? null;
  if (typeof aiJson === 'string') {
    try {
      aiJson = JSON.parse(aiJson);
    } catch (err) {
      // mantém string se não for JSON válido
    }
  }
  // Garantimos que vistorias antigas sem fileUrl usem previewDataUrl como fallback
  if (aiJson?.fotos && Array.isArray(aiJson.fotos)) {
    aiJson.fotos = aiJson.fotos.map((f: any) => ({
      ...f,
      fileUrl: f?.fileUrl || f?.previewDataUrl,
      previewDataUrl: f?.previewDataUrl || f?.fileUrl,
    }));
  }
  return {
    id: db.id,
    endereco: db.endereco,
    tipo: db.tipo,
    status: db.status,
    data: db.data?.toISOString?.() ?? db.data,
    createdFromAi: db.createdFromAi ?? false,
    aiSummary: db.aiSummary ?? null,
    aiJson,
    contractId: db.contractId ?? null,
    tenantRecordId: db.tenantRecordId ?? null,
  };
}

export async function findInspections(userId: number, filters: InspectionFilters): Promise<Inspection[]> {
  const where: any = {};
  where.userId = userId;

  if (filters.status && filters.status !== 'todos') {
    where.status = filters.status;
  }
  if (filters.tipo && filters.tipo !== 'todos') {
    where.tipo = filters.tipo;
  }
  if (filters.q) {
    const term = filters.q.toLowerCase();
    where.OR = [{ endereco: { contains: term, mode: 'insensitive' } }];
  }

  const result = await prisma.inspection.findMany({
    where,
    orderBy: { data: 'desc' },
  });

  return result.map(mapInspection);
}

export async function createInspection(
  data: {
    userId: number;
    endereco: string;
    tipo: string;
    status?: string;
    data?: string;
    createdFromAi?: boolean;
    aiSummary?: string | null;
    aiJson?: string | null;
    contractId?: string | null;
    tenantRecordId?: string | null;
  },
  tx?: Prisma.TransactionClient
): Promise<Inspection> {
  const client = tx ?? prisma;
  const serializedAiJson =
    typeof data.aiJson === 'string' ? data.aiJson : data.aiJson ? JSON.stringify(data.aiJson) : null;
  const created = await client.inspection.create({
    data: {
      userId: data.userId,
      endereco: data.endereco,
      tipo: data.tipo,
      status: data.status || 'pendente',
      data: data?.data ? new Date(data.data) : new Date(),
      createdFromAi: data.createdFromAi ?? false,
      aiSummary: data.aiSummary ?? null,
      aiJson: serializedAiJson,
      contractId: data.contractId || undefined,
      tenantRecordId: data.tenantRecordId || undefined,
    },
  });

  return mapInspection(created);
}

export async function findInspectionById(userId: number, id: number): Promise<Inspection | null> {
  const result = await prisma.inspection.findFirst({
    where: { id, userId },
  });
  if (!result) return null;
  return mapInspection(result);
}

export async function updateInspectionStatus(userId: number, id: number, status: string): Promise<Inspection | null> {
  const exists = await prisma.inspection.findFirst({ where: { id, userId } });
  if (!exists) return null;
  const updated = await prisma.inspection.update({
    where: { id },
    data: { status },
  });
  return mapInspection(updated);
}

export async function addInspectionAddendum(userId: number, id: number, text: string): Promise<Inspection | null> {
  const existing = await prisma.inspection.findFirst({ where: { id, userId } });
  if (!existing) return null;

  let aiJson: any = existing.aiJson ?? {};
  if (typeof aiJson === 'string') {
    try {
      aiJson = JSON.parse(aiJson);
    } catch {
      aiJson = {};
    }
  }

  if (!Array.isArray(aiJson.aditivos)) {
    aiJson.aditivos = [];
  }

  aiJson.aditivos.push({
    id: Date.now().toString(),
    dataIso: new Date().toISOString(),
    texto: text,
  });

  const updated = await prisma.inspection.update({
    where: { id },
    data: { aiJson: JSON.stringify(aiJson) },
  });

  return mapInspection(updated);
}

export async function addInspectionManualNote(
  userId: number,
  id: number,
  text: string
): Promise<Inspection | null> {
  const existing = await prisma.inspection.findFirst({ where: { id, userId } });
  if (!existing) return null;

  let aiJson: any = existing.aiJson ?? {};
  if (typeof aiJson === 'string') {
    try {
      aiJson = JSON.parse(aiJson);
    } catch {
      aiJson = {};
    }
  }

  if (!Array.isArray(aiJson.manualNotes)) {
    aiJson.manualNotes = [];
  }

  aiJson.manualNotes.push({
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    text,
  });

  const updated = await prisma.inspection.update({
    where: { id },
    data: { aiJson: JSON.stringify(aiJson) },
  });

  return mapInspection(updated);
}
