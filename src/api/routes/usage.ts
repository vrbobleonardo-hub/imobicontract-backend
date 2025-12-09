import { Router } from 'express';
import { getPlanLimits, PlanType } from '../../domain/billing/planLimits';
import { getOrCreateCurrentUsage } from '../../domain/billing/usageService';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { prisma } from '../../infra/db/client';

const router = Router();

router.get('/api/usage/me', async (_req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuário não encontrado.' } });
    }

    const usage = await getOrCreateCurrentUsage(userId);
    const limits = getPlanLimits(user.plan as PlanType);

    return res.json({
      plan: user.plan,
      limits,
      current: {
        inspectionsCount: usage.inspectionsCount,
        documentsCount: usage.documentsCount,
        year: usage.year,
        month: usage.month,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
