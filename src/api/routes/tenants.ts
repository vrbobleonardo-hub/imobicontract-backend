import { Router } from 'express';
import {
  createTenant,
  deleteTenant,
  findTenantById,
  listTenants,
  updateTenant,
} from '../../infra/repositories/tenantRepository';
import { sendValidationError, validateRequiredFields } from '../../utils';
import { MaritalStatus } from '../../domain/types';
import { getCurrentUserIdDev } from '../../middleware/authDev';

const router = Router();
const ALLOWED_MARITAL_STATUS: MaritalStatus[] = ['SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'DIVORCIADO', 'VIUVO'];
const ALLOWED_MARITAL_REGIME = ['COMUNHAO_PARCIAL', 'COMUNHAO_TOTAL', 'SEPARACAO_TOTAL', 'OUTRO'];

function validatePersonPayload(body: any) {
  const required = validateRequiredFields(body, [
    'fullName',
    'cpf',
    'rg',
    'rgIssuer',
    'nationality',
    'profession',
    'maritalStatus',
    'address',
  ]);
  if (required.length) {
    return { missing: required };
  }

  if (body.maritalStatus && !ALLOWED_MARITAL_STATUS.includes(body.maritalStatus)) {
    return {
      error: {
        code: 'INVALID_MARITAL_STATUS',
        message: 'Estado civil inválido. Use SOLTEIRO, CASADO, UNIAO_ESTAVEL, DIVORCIADO ou VIUVO.',
      },
    };
  }

  if (body.maritalStatus === 'CASADO' && !body.maritalRegime) {
    return { error: { code: 'MISSING_REGIME', message: 'Regime de casamento é obrigatório quando casado(a).' } };
  }

  if (body.maritalStatus === 'UNIAO_ESTAVEL' || body.maritalStatus === 'CASADO') {
    if (!body.spouseName) {
      return {
        error: { code: 'MISSING_SPOUSE', message: 'Informe o nome do cônjuge para casados ou união estável.' },
      };
    }
  }

  if (body.maritalRegime && !ALLOWED_MARITAL_REGIME.includes(body.maritalRegime)) {
    return {
      error: {
        code: 'INVALID_MARITAL_REGIME',
        message: 'Regime inválido. Use COMUNHAO_PARCIAL, COMUNHAO_TOTAL, SEPARACAO_TOTAL ou OUTRO.',
      },
    };
  }

  return { error: null };
}

router.post('/api/tenants', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const payload = req.body || {};
  const { error, missing } = validatePersonPayload(payload);
  if (missing?.length) return sendValidationError(res, missing, 'Campos obrigatórios: nome, CPF, RG, estado civil e endereço.');
  if (error) {
    if (typeof (error as any) === 'function') return;
    return res.status(400).json({ error });
  }
  try {
    const created = await createTenant(userId, {
      fullName: payload.fullName,
      cpf: payload.cpf,
      rg: payload.rg,
      rgIssuer: payload.rgIssuer,
      nationality: payload.nationality,
      profession: payload.profession,
      maritalStatus: payload.maritalStatus,
      maritalRegime: payload.maritalRegime,
      spouseName: payload.spouseName,
      spouseCpf: payload.spouseCpf,
      spouseRg: payload.spouseRg,
      isUnionStable: payload.isUnionStable,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    });
    return res.json(created);
  } catch (error) {
    console.error('[tenants] erro ao criar:', error);
    const message = (error as any)?.code === 'P2002' ? 'CPF já cadastrado para outro inquilino.' : 'Erro ao criar inquilino.';
    return res.status(500).json({ error: { code: 'TENANT_CREATE_ERROR', message } });
  }
});

router.get('/api/tenants', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const q = (req.query.q as string) || undefined;
  try {
    const tenants = await listTenants(userId, q);
    return res.json(tenants);
  } catch (error) {
    console.error('[tenants] erro ao listar:', error);
    return res.status(500).json({ error: { code: 'TENANT_LIST_ERROR', message: 'Erro ao listar inquilinos.' } });
  }
});

router.get('/api/tenants/:id', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
  try {
    const tenant = await findTenantById(userId, id);
    if (!tenant) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inquilino não encontrado.' } });
    return res.json(tenant);
  } catch (error) {
    console.error('[tenants] erro ao buscar:', error);
    return res.status(500).json({ error: { code: 'TENANT_FIND_ERROR', message: 'Erro ao buscar inquilino.' } });
  }
});

router.put('/api/tenants/:id', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
  const payload = req.body || {};
  const { error, missing } = validatePersonPayload(payload);
  if (missing?.length) return sendValidationError(res, missing, 'Campos obrigatórios: nome, CPF, RG, estado civil e endereço.');
  if (error) {
    if (typeof (error as any) === 'function') return;
    return res.status(400).json({ error });
  }
  try {
    const updated = await updateTenant(userId, id, {
      fullName: payload.fullName,
      cpf: payload.cpf,
      rg: payload.rg,
      rgIssuer: payload.rgIssuer,
      nationality: payload.nationality,
      profession: payload.profession,
      maritalStatus: payload.maritalStatus,
      maritalRegime: payload.maritalRegime,
      spouseName: payload.spouseName,
      spouseCpf: payload.spouseCpf,
      spouseRg: payload.spouseRg,
      isUnionStable: payload.isUnionStable,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    });
    if (!updated) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inquilino não encontrado.' } });
    return res.json(updated);
  } catch (error) {
    console.error('[tenants] erro ao atualizar:', error);
    return res.status(500).json({ error: { code: 'TENANT_UPDATE_ERROR', message: 'Erro ao atualizar inquilino.' } });
  }
});

router.delete('/api/tenants/:id', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } });
  try {
    const result = await deleteTenant(userId, id);
    if (!result) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inquilino não encontrado.' } });
    return res.json({ ok: true, softDeleted: Boolean(result?.deletedAt) });
  } catch (error) {
    console.error('[tenants] erro ao deletar:', error);
    return res.status(500).json({ error: { code: 'TENANT_DELETE_ERROR', message: 'Erro ao deletar inquilino.' } });
  }
});

export default router;
