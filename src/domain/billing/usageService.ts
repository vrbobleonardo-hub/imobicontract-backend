import { Prisma, UsageMonthly } from '@prisma/client';
import { prisma } from '../../infra/db/client';
import { getPlanLimits, PlanType } from './planLimits';
import { PlanLimitError, PlanLimitKind } from '../errors/PlanLimitError';

type Period = { year: number; month: number };
type DbClient = Prisma.TransactionClient;

function currentPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export async function getOrCreateCurrentUsage(userId: number, tx?: DbClient): Promise<UsageMonthly> {
  const { year, month } = currentPeriod();
  const client = tx ?? prisma;
  return client.usageMonthly.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {},
    create: { userId, year, month },
  });
}

async function applyUsageIncrement(
  tx: DbClient,
  userId: number,
  kind: PlanLimitKind,
  amount: number = 1
): Promise<UsageMonthly> {
  const { year, month } = currentPeriod();
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const limits = getPlanLimits(user.plan as PlanType);
  const usage = await tx.usageMonthly.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {},
    create: { userId, year, month },
  });

  if (kind === 'INSPECTION' && usage.inspectionsCount + 1 > limits.maxInspections) {
    throw new PlanLimitError(kind, limits.maxInspections, usage.inspectionsCount);
  }
  if (kind === 'DOCUMENT' && usage.documentsCount + 1 > limits.maxDocuments) {
    throw new PlanLimitError(kind, limits.maxDocuments, usage.documentsCount);
  }
  const mentorFilesLimit = limits.maxMentorFilesPerMonth;
  if (kind === 'MENTOR_FILE_QUESTION' && usage.mentorFileQuestionsCount + amount > mentorFilesLimit) {
    throw new PlanLimitError(kind, mentorFilesLimit, usage.mentorFileQuestionsCount);
  }

  const data: Prisma.UsageMonthlyUpdateInput = {};
  if (kind === 'INSPECTION') data.inspectionsCount = { increment: 1 };
  if (kind === 'DOCUMENT') data.documentsCount = { increment: 1 };
  if (kind === 'MENTOR_FILE_QUESTION') data.mentorFileQuestionsCount = { increment: amount };

  return tx.usageMonthly.update({
    where: { userId_year_month: { userId, year, month } },
    data,
  });
}

export async function checkAndIncrementInspectionUsage(userId: number, tx?: DbClient): Promise<UsageMonthly> {
  if (tx) {
    return applyUsageIncrement(tx, userId, 'INSPECTION');
  }
  return prisma.$transaction((trx) => applyUsageIncrement(trx, userId, 'INSPECTION'));
}

export async function checkAndIncrementDocumentUsage(userId: number, tx?: DbClient): Promise<UsageMonthly> {
  if (tx) {
    return applyUsageIncrement(tx, userId, 'DOCUMENT');
  }
  return prisma.$transaction((trx) => applyUsageIncrement(trx, userId, 'DOCUMENT'));
}

export async function checkMentorFileQuestionLimit(userId: number, attachmentsCount: number): Promise<void> {
  const { year, month } = currentPeriod();
  const [user, usage] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.usageMonthly.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {},
      create: { userId, year, month },
    }),
  ]);

  if (!user) throw new Error('USER_NOT_FOUND');

  const limits = getPlanLimits(user.plan as PlanType);
  if (attachmentsCount > limits.maxAttachmentsPerQuestion) {
    throw new Error(
      `Máximo de ${limits.maxAttachmentsPerQuestion} anexos por pergunta. Remova arquivos e tente novamente.`
    );
  }
  const mentorFilesLimit = limits.maxMentorFilesPerMonth;
  if (usage.mentorFileQuestionsCount + attachmentsCount > mentorFilesLimit) {
    throw new PlanLimitError('MENTOR_FILE_QUESTION', mentorFilesLimit, usage.mentorFileQuestionsCount);
  }
}

export async function incrementMentorFileQuestionUsage(
  userId: number,
  attachmentsCount: number,
  tx?: DbClient
): Promise<UsageMonthly> {
  if (tx) {
    return applyUsageIncrement(tx, userId, 'MENTOR_FILE_QUESTION', attachmentsCount);
  }
  return prisma.$transaction((trx) => applyUsageIncrement(trx, userId, 'MENTOR_FILE_QUESTION', attachmentsCount));
}

export async function getMentorFileUsage(userId: number): Promise<{
  used: number;
  limit: number;
  month: number;
  year: number;
}> {
  const { year, month } = currentPeriod();
  const [user, usage] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.usageMonthly.upsert({
      where: { userId_year_month: { userId, year, month } },
      update: {},
      create: { userId, year, month },
    }),
  ]);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const limits = getPlanLimits(user.plan as PlanType);
  return {
    used: usage.mentorFileQuestionsCount,
    limit: limits.maxMentorFilesPerMonth,
    month,
    year,
  };
}
