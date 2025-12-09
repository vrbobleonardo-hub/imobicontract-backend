import { Router } from 'express';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { prisma } from '../../infra/db/client';

const router = Router();

router.get('/api/overview/me', async (_req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const [totalProperties, totalInspections, totalContracts, totalNotifications] = await Promise.all([
      prisma.property.count({ where: { userId } }),
      prisma.inspection.count({ where: { userId } }),
      prisma.contract.count({ where: { userId } }),
      prisma.notification.count({ where: { userId } }),
    ]);
    res.json({
      totalProperties,
      totalInspections,
      totalContracts,
      totalNotifications,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
