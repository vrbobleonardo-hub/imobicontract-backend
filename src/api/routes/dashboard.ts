import { Router } from 'express';
import { prisma } from '../../infra/db/client';
import { getCurrentUserIdDev } from '../../middleware/authDev';

const router = Router();

router.get('/api/dashboard/summary', async (_req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const [totalContracts, activeContracts, reviewingContracts, pendingNotifications, totalInspections, pendingInspections] =
      await Promise.all([
        prisma.contract.count({ where: { userId } }),
        prisma.contract.count({ where: { status: 'ativo', userId } }),
        prisma.contract.count({ where: { status: 'em revisão', userId } }),
        prisma.notification.count({ where: { status: 'PENDENTE', userId } }),
        prisma.inspection.count({ where: { userId } }),
        prisma.inspection.count({ where: { status: 'pendente', userId } }),
      ]);

    res.json({
      totalContracts,
      activeContracts,
      reviewingContracts,
      pendingNotifications,
      totalInspections,
      pendingInspections,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
