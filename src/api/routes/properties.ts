import { Router } from 'express';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import {
  createUserProperty,
  deleteUserProperty,
  getUserProperties,
  updateUserProperty,
} from '../../infra/repositories/propertyRepository';

const router = Router();

router.get('/api/properties', async (_req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const list = await getUserProperties(userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/api/properties', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const { title, address, city, state, zipCode, type, status, landlordName, landlordContact, notes } = req.body || {};
    if (!title || !address || !city) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'title, address e city são obrigatórios.' } });
    }
    const created = await createUserProperty(userId, {
      title,
      address,
      city,
      state,
      zipCode,
      type,
      status,
      landlordName,
      landlordContact,
      notes,
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put('/api/properties/:id', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    const updated = await updateUserProperty(userId, id, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Imóvel não encontrado.' } });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/api/properties/:id', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
    }
    const deleted = await deleteUserProperty(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Imóvel não encontrado.' } });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
