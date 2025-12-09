import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import {
  Notification,
  NotificationFilters,
  NotificationStatus,
  NotificationType,
  PersonSummary,
  PropertySummary,
} from '../../domain/types';

const mapPerson = (person?: any): PersonSummary | null => {
  if (!person) return null;
  return {
    id: person.id,
    fullName: person.fullName,
    cpf: person.cpf,
    email: person.email,
    phone: person.phone,
  };
};

const mapProperty = (property?: any): PropertySummary | null => {
  if (!property) return null;
  return {
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    state: property.state,
  };
};

function mapNotification(db: any): Notification {
  return {
    id: db.id,
    title: db.title,
    body: db.body,
    type: db.type,
    status: db.status,
    propertyId: db.propertyId,
    landlordId: db.landlordId,
    tenantId: db.tenantId,
    createdAt: db.createdAt?.toISOString?.() ?? db.createdAt,
    updatedAt: db.updatedAt?.toISOString?.() ?? db.updatedAt,
    property: mapProperty(db.property),
    landlord: mapPerson(db.landlord),
    tenant: mapPerson(db.tenant),
  };
}

export async function findNotifications(userId: number, filters: NotificationFilters): Promise<Notification[]> {
  const where: Prisma.NotificationWhereInput = { userId };

  if (filters.status && filters.status !== 'todos') {
    where.status = filters.status;
  }
  if (filters.type && filters.type !== 'todos') {
    where.type = filters.type;
  }
  if (filters.propertyId) {
    where.propertyId = filters.propertyId;
  }
  const search = filters.q?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { body: { contains: search } },
    ];
  }

  const result = await prisma.notification.findMany({
    where,
    include: {
      property: true,
      landlord: true,
      tenant: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return result.map(mapNotification);
}

export async function createNotification(
  userId: number,
  data: {
    title: string;
    body: string;
    type: NotificationType;
    status?: NotificationStatus;
    propertyId?: number | null;
    landlordId?: string | null;
    tenantId?: string | null;
  },
  tx?: Prisma.TransactionClient
): Promise<Notification> {
  const client = tx ?? prisma;
  const created = await client.notification.create({
    data: {
      userId,
      title: data.title,
      body: data.body,
      type: data.type,
      status: data.status || 'PENDENTE',
      propertyId: data.propertyId || null,
      landlordId: data.landlordId || null,
      tenantId: data.tenantId || null,
    },
    include: {
      property: true,
      landlord: true,
      tenant: true,
    },
  });

  return mapNotification(created);
}

export async function updateNotification(
  userId: number,
  id: number,
  data: Partial<{
    title: string;
    body: string;
    type: NotificationType;
    status: NotificationStatus;
    propertyId?: number | null;
    landlordId?: string | null;
    tenantId?: string | null;
  }>,
  tx?: Prisma.TransactionClient
): Promise<Notification | null> {
  const client = tx ?? prisma;

  const updateData: Prisma.NotificationUncheckedUpdateManyInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.body !== undefined) updateData.body = data.body;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.propertyId !== undefined) updateData.propertyId = data.propertyId;
  if (data.landlordId !== undefined) updateData.landlordId = data.landlordId;
  if (data.tenantId !== undefined) updateData.tenantId = data.tenantId;

  if (!Object.keys(updateData).length) {
    const existing = await client.notification.findFirst({
      where: { id, userId },
      include: { property: true, landlord: true, tenant: true },
    });
    return existing ? mapNotification(existing) : null;
  }

  const updated = await client.notification.updateMany({
    where: { id, userId },
    data: updateData,
  });

  if (!updated.count) return null;

  const fresh = await client.notification.findFirst({
    where: { id, userId },
    include: { property: true, landlord: true, tenant: true },
  });
  return fresh ? mapNotification(fresh) : null;
}
