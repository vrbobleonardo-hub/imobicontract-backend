import { Router } from 'express';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { createNotification, findNotifications, updateNotification } from '../../infra/repositories/notificationRepository';
import { NotificationFilters, NotificationStatus, NotificationType } from '../../domain/types';
import { PlanLimitError } from '../../domain/errors/PlanLimitError';
import { checkAndIncrementDocumentUsage } from '../../domain/billing/usageService';
import { NOTIFICATION_TEMPLATES } from '../../domain/notifications/templates';
import { prisma } from '../../infra/db/client';

const router = Router();

const STATUS_VALUES: NotificationStatus[] = ['PENDENTE', 'ENVIADA', 'ARQUIVADA'];
const TYPE_VALUES: NotificationType[] = NOTIFICATION_TEMPLATES.map((tpl) => tpl.type);

const normalizeStatus = (raw?: string): NotificationStatus | undefined => {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return STATUS_VALUES.includes(upper as NotificationStatus) ? (upper as NotificationStatus) : undefined;
};

const normalizeType = (raw?: string): NotificationType | undefined => {
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  return TYPE_VALUES.includes(upper as NotificationType) ? (upper as NotificationType) : undefined;
};

const sendError = (res: any, statusCode: number, message: string) => res.status(statusCode).json({ error: message });

router.get('/api/notifications/templates', (_req, res) => {
  res.json(NOTIFICATION_TEMPLATES);
});

router.get('/api/notifications', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const filters: NotificationFilters = {
      status: normalizeStatus(typeof req.query.status === 'string' ? req.query.status : undefined) ?? 'todos',
      type: normalizeType(typeof req.query.type === 'string' ? req.query.type : undefined) ?? 'todos',
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      propertyId:
        typeof req.query.propertyId === 'string' && !Number.isNaN(Number(req.query.propertyId))
          ? Number(req.query.propertyId)
          : undefined,
    };

    const result = await findNotifications(userId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/api/notifications', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const { title, body, type, status, propertyId, landlordId, tenantId } = req.body || {};
    const normalizedType = normalizeType(type);
    const normalizedStatus = normalizeStatus(status) || 'PENDENTE';
    const parsedPropertyId =
      propertyId === null || propertyId === undefined ? undefined : Number(propertyId);

    if (!title || !body || !normalizedType) {
      return sendError(res, 400, 'Campos obrigatórios: title, body, type.');
    }

    if (propertyId !== undefined && propertyId !== null && Number.isNaN(parsedPropertyId)) {
      return sendError(res, 400, 'propertyId inválido.');
    }

    const notification = await prisma.$transaction(async (tx) => {
      await checkAndIncrementDocumentUsage(userId, tx);
      return createNotification(
        userId,
        {
          title,
          body,
          type: normalizedType,
          status: normalizedStatus,
          propertyId: parsedPropertyId ?? null,
          landlordId: landlordId ?? undefined,
          tenantId: tenantId ?? undefined,
        },
        tx
      );
    });
    res.status(201).json(notification);
  } catch (err) {
    if (err instanceof PlanLimitError && err.kind === 'DOCUMENT') {
      return res.status(403).json({
        error: { code: 'PLAN_LIMIT_DOCUMENT', message: 'Limite mensal de documentos do seu plano foi atingido.' },
      });
    }
    next(err);
  }
});

router.put('/api/notifications/:id', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return sendError(res, 400, 'ID inválido.');
    }

    const { title, body, type, status, propertyId, landlordId, tenantId } = req.body || {};
    const normalizedType = normalizeType(type);
    const normalizedStatus = normalizeStatus(status);
    const parsedPropertyId =
      propertyId === null || propertyId === undefined ? undefined : Number(propertyId);

    if (!title || !body || !normalizedType || !normalizedStatus) {
      return sendError(res, 400, 'Campos obrigatórios: title, body, type, status.');
    }

    if (propertyId !== undefined && propertyId !== null && Number.isNaN(parsedPropertyId)) {
      return sendError(res, 400, 'propertyId inválido.');
    }

    const updated = await updateNotification(
      userId,
      id,
      {
        title,
        body,
        type: normalizedType,
        status: normalizedStatus,
        propertyId: parsedPropertyId ?? null,
        landlordId: landlordId ?? undefined,
        tenantId: tenantId ?? undefined,
      },
      undefined
    );

    if (!updated) {
      return sendError(res, 404, 'Notificação não encontrada.');
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
