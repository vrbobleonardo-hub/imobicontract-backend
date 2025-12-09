export type PlanLimits = {
  maxInspections: number;
  maxDocuments: number;
  maxMentorFilesPerMonth: number;
  maxAttachmentsPerQuestion: number;
  maxAttachmentSizeMb: number;
};

export type PlanType = 'STARTER' | 'PRO' | 'IMOBILIARIA';

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  STARTER: {
    maxInspections: 5,
    maxDocuments: 15,
    maxMentorFilesPerMonth: 15,
    maxAttachmentsPerQuestion: 3,
    maxAttachmentSizeMb: 10,
  },
  PRO: {
    maxInspections: 15,
    maxDocuments: 25,
    maxMentorFilesPerMonth: 40,
    maxAttachmentsPerQuestion: 3,
    maxAttachmentSizeMb: 10,
  },
  IMOBILIARIA: {
    maxInspections: 60,
    maxDocuments: 120,
    maxMentorFilesPerMonth: 80,
    maxAttachmentsPerQuestion: 3,
    maxAttachmentSizeMb: 10,
  },
};

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.STARTER;
}
