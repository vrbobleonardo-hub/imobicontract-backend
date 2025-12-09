import { Router } from 'express';
import { validateRequiredFields, sendValidationError } from '../../utils';
import { createContractRecord, findContracts } from '../../infra/repositories/contractRepository';
import { ContractFilters, MaritalStatus } from '../../domain/types';
import { prisma } from '../../infra/db/client';
import { buildContractText, ContractTemplatePerson } from '../../domain/contractTemplate';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { PlanLimitError } from '../../domain/errors/PlanLimitError';
import { checkAndIncrementDocumentUsage } from '../../domain/billing/usageService';

const router = Router();
const MARITAL_STATUS: MaritalStatus[] = ['SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'DIVORCIADO', 'VIUVO'];
const digitsOnly = (v?: string | null) => (v ? v.replace(/\D/g, '') : '');

async function ensureDevUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) return user;
  return prisma.user.create({
    data: {
      id: userId,
      email: `dev${userId}@example.com`,
      name: 'Dev User',
    },
  });
}

router.get('/api/contracts', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    await ensureDevUser(userId);
    const filters: ContractFilters = {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      tipo: typeof req.query.tipo === 'string' ? req.query.tipo : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    };

    const result = await findContracts(userId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/api/contracts', async (req, res, next) => {
  try {
    const userId = getCurrentUserIdDev();
    await ensureDevUser(userId);
    console.log('[contracts/create] body recebido:', req.body);
    const body = req.body || {};
    const landlordIds = Array.isArray(body.landlordIds) ? body.landlordIds : [];
    const tenantIds = Array.isArray(body.tenantIds) ? body.tenantIds : [];
    if (!landlordIds.length || !tenantIds.length) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARTIES',
          message: 'Selecione ou cadastre pelo menos um locador e um locatário antes de gerar o contrato.',
        },
      });
    }

    const required = validateRequiredFields(body, [
      'startDate',
      'endDate',
      'rentValue',
      'dueDay',
      'city',
      'state',
      'fullAddress',
    ]);
    if (required.length) {
      return sendValidationError(
        res,
        required,
        'Campos obrigatórios: startDate, endDate, rentValue, dueDay, city, state, fullAddress.'
      );
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return res.status(400).json({
        error: { code: 'INVALID_DATES', message: 'Datas de início e fim do contrato são obrigatórias e precisam ser válidas.' },
      });
    }

    const numberFields = ['rentValue', 'condoValue', 'iptuValue', 'depositValue', 'dueDay'];
    for (const field of numberFields) {
      if (body[field] !== undefined && body[field] !== null) {
        const parsed = Number(body[field]);
        if (!Number.isFinite(parsed)) {
          return res
            .status(400)
            .json({ error: { code: 'INVALID_NUMBER', message: `Campo ${field} deve ser numérico.` } });
        }
      }
    }
    if (body.dueDay < 1 || body.dueDay > 31) {
      return res.status(400).json({
        error: { code: 'INVALID_DUEDAY', message: 'Dia de vencimento deve estar entre 1 e 31.' },
      });
    }
    if (body.contractDurationMonths !== undefined) {
      const months = Number(body.contractDurationMonths);
      if (!Number.isFinite(months) || months <= 0) {
        return res.status(400).json({
          error: { code: 'INVALID_DURATION', message: 'Prazo (meses) deve ser maior que zero.' },
        });
      }
    }

    const cpfFields = [
      { key: 'rentRecipientCpf', label: 'CPF do recebedor do aluguel' },
      { key: 'depositCpf', label: 'CPF da conta caução' },
    ];
    for (const field of cpfFields) {
      const digits = digitsOnly(body[field.key]);
      if (digits && digits.length !== 11) {
        return res.status(400).json({
          error: { code: 'INVALID_CPF', message: `${field.label} deve ter 11 dígitos numéricos.` },
        });
      }
    }
    const agency = digitsOnly(body.agency);
    if (agency && agency.length > 5) {
      return res.status(400).json({
        error: { code: 'INVALID_AGENCY', message: 'Agência deve ter no máximo 5 dígitos.' },
      });
    }
    const account = (body.account || '').trim();
    if (account && !/^[0-9-]{1,13}$/.test(account)) {
      return res.status(400).json({
        error: { code: 'INVALID_ACCOUNT', message: 'Conta deve conter apenas dígitos e no máximo um hífen.' },
      });
    }

    const [landlords, tenants] = await Promise.all([
      prisma.landlord.findMany({ where: { id: { in: landlordIds }, deletedAt: null, userId } }),
      prisma.tenant.findMany({ where: { id: { in: tenantIds }, deletedAt: null, userId } }),
    ]);
    if (landlords.length !== landlordIds.length) {
      return res
        .status(400)
        .json({ error: { code: 'INVALID_LANDLORD', message: 'Alguns locadores informados não foram encontrados.' } });
    }
    if (tenants.length !== tenantIds.length) {
      return res
        .status(400)
        .json({ error: { code: 'INVALID_TENANT', message: 'Alguns locatários informados não foram encontrados.' } });
    }

    const toTemplatePerson = (person: any): ContractTemplatePerson => ({
      fullName: person.fullName,
      nationality: person.nationality,
      profession: person.profession,
      rg: person.rg,
      rgIssuer: person.rgIssuer,
      cpf: person.cpf,
      maritalStatus: MARITAL_STATUS.includes(person.maritalStatus) ? person.maritalStatus : 'SOLTEIRO',
      maritalRegime: person.maritalRegime,
      spouseName: person.spouseName,
      spouseCpf: person.spouseCpf,
      spouseRg: person.spouseRg,
      isUnionStable: person.isUnionStable,
      address: person.address,
    });

    const templateText = buildContractText({
      landlords: landlords.map(toTemplatePerson),
      tenants: tenants.map(toTemplatePerson),
      property: {
        fullAddress: body.fullAddress,
        description: body.propertyDescription,
        parkingSpaces: body.parkingSpaces,
        parkingType: body.parkingType,
        parkingNumber: body.parkingNumber,
        district: body.district,
        postalCode: body.postalCode,
        city: body.city,
        state: body.state,
      },
      dates: {
        startDate: body.startDate,
        endDate: body.endDate,
        contractDurationMonths: body.contractDurationMonths ? Number(body.contractDurationMonths) : undefined,
        exemptionMonth: body.exemptionMonth ? Number(body.exemptionMonth) : undefined,
        depositLimitDate: body.depositLimitDate,
        contractSignLimitDate: body.contractSignLimitDate,
        keysDeliveryDate: body.keysDeliveryDate,
      },
      values: {
        rentValue: Number(body.rentValue),
        condoValue: Number(body.condoValue || 0),
        iptuValue: Number(body.iptuValue || 0),
        depositValue: Number(body.depositValue || 0),
        totalMonthly: Number(body.totalMonthly || 0),
      },
      payment: {
        dueDay: Number(body.dueDay),
        rentRecipientName: body.rentRecipientName,
        rentRecipientCpf: body.rentRecipientCpf,
        bankName: body.bankName,
        agency: body.agency,
        account: body.account,
        pixKey: body.pixKey,
        depositAccountName: body.depositAccountName,
        depositBankName: body.depositBankName,
        depositAgency: body.depositAgency,
        depositAccount: body.depositAccount,
        depositCpf: body.depositCpf,
      },
      admin: {
        creci: body.creci,
        phone: body.adminPhone,
        address: body.adminAddress,
        name: body.adminName,
        whatsapp: body.adminWhatsapp,
      },
      insurance: {
        referenceValue: body.insuranceReferenceValue ? Number(body.insuranceReferenceValue) : undefined,
      },
      codes: {
        energyCode: body.energyCode,
        gasCode: body.gasCode,
        waterCode: body.waterCode,
      },
    });

    const contract = await prisma.$transaction(async (tx) => {
      await checkAndIncrementDocumentUsage(userId, tx);
      return createContractRecord(
        userId,
        {
          titulo: body.titulo,
          endereco: body.fullAddress,
          tipo: body.tipo,
          status: body.status,
          startDate: body.startDate,
          endDate: body.endDate,
          rentValue: Number(body.rentValue),
          condoValue: Number(body.condoValue || 0),
          iptuValue: Number(body.iptuValue || 0),
          depositValue: Number(body.depositValue || 0),
          dueDay: Number(body.dueDay),
          city: body.city,
          state: body.state,
          fullAddress: body.fullAddress,
          propertyDescription: body.propertyDescription,
          landlordIds,
          tenantIds,
          generatedText: templateText,
        },
        tx
      );
    });

    res.status(201).json({ contract, generatedText: templateText });
  } catch (err) {
    if (err instanceof PlanLimitError && err.kind === 'DOCUMENT') {
      return res.status(403).json({
        error: { code: 'PLAN_LIMIT_DOCUMENT', message: 'Limite mensal de documentos do seu plano foi atingido.' },
      });
    }
    console.error('[contracts/create] erro ao criar contrato:', err);
    return res.status(500).json({
      error: {
        code: 'CONTRACT_CREATE_ERROR',
        message: (err as Error)?.message || 'Erro interno ao criar contrato.',
      },
    });
  }
});

export default router;
