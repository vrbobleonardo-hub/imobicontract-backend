import { Router } from 'express';
import { validateRequiredFields, sendValidationError } from '../../utils';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import {
  addInspectionAddendum,
  addInspectionManualNote,
  createInspection,
  findInspectionById,
  findInspections,
  updateInspectionStatus,
} from '../../infra/repositories/inspectionRepository';
import { InspectionFilters } from '../../domain/types';
import { prisma } from '../../infra/db/client';
import { PlanLimitError } from '../../domain/errors/PlanLimitError';
import { checkAndIncrementInspectionUsage } from '../../domain/billing/usageService';

const router = Router();

router.get('/api/inspections', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const filters: InspectionFilters = {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      tipo: typeof req.query.tipo === 'string' ? req.query.tipo : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    };

    const result = await findInspections(userId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/api/inspections', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const { endereco, tipo, status, data, createdFromAi, aiSummary, aiJson, observacoes, contractId, tenantId } =
      req.body || {};
    const missing = validateRequiredFields(req.body, ['endereco', 'tipo']);
    if (missing.length) {
      return sendValidationError(res, missing, 'Campos obrigatórios: endereco, tipo.');
    }

    if (contractId) {
      const exists = await prisma.contract.findFirst({ where: { id: contractId, userId } });
      if (!exists) {
        return res.status(400).json({ error: { code: 'INVALID_CONTRACT', message: 'Contrato vinculado não encontrado.' } });
      }
    }
    if (tenantId) {
      const tenantExists = await prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null, userId } });
      if (!tenantExists) {
        return res.status(400).json({ error: { code: 'INVALID_TENANT', message: 'Inquilino vinculado não encontrado.' } });
      }
    }

    const inspection = await prisma.$transaction(async (tx) => {
      await checkAndIncrementInspectionUsage(userId, tx);
      return createInspection(
        {
          userId,
          endereco,
          tipo,
          status,
          data,
          createdFromAi,
          aiSummary,
          aiJson,
          contractId: contractId || undefined,
          tenantRecordId: tenantId || undefined,
          // TODO: considerar persistir observacoes em coluna futura
        },
        tx
      );
    });
    res.status(201).json(inspection);
  } catch (err) {
    if (err instanceof PlanLimitError && err.kind === 'INSPECTION') {
      return res.status(403).json({
        error: { code: 'PLAN_LIMIT_INSPECTION', message: 'Limite mensal de vistorias do seu plano foi atingido.' },
      });
    }
    next(err);
  }
});

router.get('/api/inspections/:id', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    const inspection = await findInspectionById(userId, id);
    if (!inspection) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vistoria não encontrada.' } });
    }
    res.json(inspection);
  } catch (err) {
    next(err);
  }
});

router.patch('/api/inspections/:id/status', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    const { status } = req.body || {};
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_STATUS', message: 'Status é obrigatório.' } });
    }

    const updated = await updateInspectionStatus(userId, id, status);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vistoria não encontrada.' } });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/api/inspections/:id/addendums', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    const { text } = req.body || {};
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_TEXT', message: 'Texto do aditivo é obrigatório.' } });
    }

    const updated = await addInspectionAddendum(userId, id, text);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vistoria não encontrada.' } });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/api/inspections/:id/manual-notes', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    const { text } = req.body || {};
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_TEXT', message: 'Texto da observação é obrigatório.' } });
    }

    const updated = await addInspectionManualNote(userId, id, text);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vistoria não encontrada.' } });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
