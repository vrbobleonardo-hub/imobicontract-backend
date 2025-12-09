import { prisma } from '../db/client';
import { Subscription } from '../../domain/types';

function mapSubscription(db: any): Subscription {
  return {
    id: db.id,
    email: db.email,
    planId: db.planId,
    status: db.status,
    priceCents: db.priceCents,
    currency: db.currency,
    mpPrefId: db.mpPrefId,
    mpPaymentId: db.mpPaymentId,
    validUntil: db.validUntil?.toISOString?.() ?? db.validUntil ?? null,
    createdAt: db.createdAt?.toISOString?.() ?? db.createdAt,
    updatedAt: db.updatedAt?.toISOString?.() ?? db.updatedAt,
  };
}

export async function createPendingSubscription(params: {
  email: string;
  planId: string;
  priceCents: number;
  currency: string;
  mpPrefId?: string | null;
}): Promise<Subscription> {
  const created = await prisma.subscription.create({
    data: {
      email: params.email,
      planId: params.planId,
      priceCents: params.priceCents,
      currency: params.currency,
      status: 'PENDING',
      mpPrefId: params.mpPrefId ?? null,
    },
  });
  return mapSubscription(created);
}

export async function findByPrefId(prefId: string): Promise<Subscription | null> {
  const sub = await prisma.subscription.findFirst({ where: { mpPrefId: prefId } });
  return sub ? mapSubscription(sub) : null;
}

export async function updateStatusByPaymentId(paymentId: string, status: string): Promise<Subscription | null> {
  const updated = await prisma.subscription.updateMany({
    where: { mpPaymentId: paymentId },
    data: { status },
  });
  if (!updated.count) return null;
  const sub = await prisma.subscription.findFirst({ where: { mpPaymentId: paymentId } });
  return sub ? mapSubscription(sub) : null;
}

export async function updateStatusByPrefId(prefId: string, status: string): Promise<number> {
  const updated = await prisma.subscription.updateMany({
    where: { mpPrefId: prefId },
    data: { status },
  });
  return updated.count;
}

export async function activateSubscriptionByPayment(params: {
  email: string;
  planId: string;
  paymentId: string;
  priceCents: number;
  currency: string;
  validUntil: Date;
}): Promise<Subscription> {
  // Idempotente: se já existir mpPaymentId, não duplica
  const existing = await prisma.subscription.findUnique({ where: { mpPaymentId: params.paymentId } });
  if (existing) return mapSubscription(existing);

  // Tenta achar pela pref/email/plan mais recente PENDING para atualizar
  const pending = await prisma.subscription.findFirst({
    where: {
      email: params.email,
      planId: params.planId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (pending) {
    const updated = await prisma.subscription.update({
      where: { id: pending.id },
      data: {
        status: 'ACTIVE',
        mpPaymentId: params.paymentId,
        validUntil: params.validUntil,
        priceCents: params.priceCents,
        currency: params.currency,
      },
    });
    return mapSubscription(updated);
  }

  const created = await prisma.subscription.create({
    data: {
      email: params.email,
      planId: params.planId,
      status: 'ACTIVE',
      mpPaymentId: params.paymentId,
      validUntil: params.validUntil,
      priceCents: params.priceCents,
      currency: params.currency,
    },
  });
  return mapSubscription(created);
}

export async function findActiveSubscriptionByEmail(email: string): Promise<Subscription | null> {
  const sub = await prisma.subscription.findFirst({
    where: {
      email,
      status: 'ACTIVE',
    },
    orderBy: { validUntil: 'desc' },
  });
  return sub ? mapSubscription(sub) : null;
}
