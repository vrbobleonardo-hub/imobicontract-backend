import { Router } from 'express';
import { getAppSettings, updateAppSettings } from '../../infra/repositories/appSettingsRepository';

const router = Router();

router.get('/api/settings', async (_req, res) => {
  try {
    const settings = await getAppSettings();
    return res.json(settings);
  } catch (err) {
    console.error('[settings] erro ao buscar configurações', err);
    return res.status(500).json({
      error: { code: 'SETTINGS_FETCH_ERROR', message: 'Não foi possível carregar as configurações.' },
    });
  }
});

router.put('/api/settings', async (req, res) => {
  try {
    const payload = req.body || {};

    if (payload.defaultContractTermMonths !== undefined && payload.defaultContractTermMonths <= 0) {
      return res.status(400).json({
        error: { code: 'INVALID_CONTRACT_TERM', message: 'Prazo padrão deve ser maior que zero.' },
      });
    }

    if (payload.notifyBeforeDueDays !== undefined && payload.notifyBeforeDueDays < 0) {
      return res.status(400).json({
        error: { code: 'INVALID_NOTIFY_DAYS', message: 'Dias para lembrete devem ser zero ou positivos.' },
      });
    }

    const updated = await updateAppSettings(payload);
    return res.json(updated);
  } catch (err) {
    console.error('[settings] erro ao atualizar configurações', err);
    return res.status(500).json({
      error: { code: 'SETTINGS_UPDATE_ERROR', message: 'Não foi possível salvar as configurações agora.' },
    });
  }
});

export default router;
