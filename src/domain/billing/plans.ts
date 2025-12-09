export type PlanId = 'basic_monthly' | 'pro_monthly';

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    priceCents: number;
    currency: 'BRL';
    interval: 'month';
  }
> = {
  basic_monthly: {
    id: 'basic_monthly',
    name: 'Imobi Contract Basic Mensal',
    priceCents: 4990,
    currency: 'BRL',
    interval: 'month',
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Imobi Contract Pro Mensal',
    priceCents: 9700,
    currency: 'BRL',
    interval: 'month',
  },
};

export function resolvePlan(planId: string) {
  return PLANS[planId as PlanId] ?? null;
}
