import { Router } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { env } from '../../config/env';
import { resolvePlan } from '../../domain/billing/plans';
import {
  activateSubscriptionByPayment,
  createPendingSubscription,
  findActiveSubscriptionByEmail,
  findByPrefId,
  updateStatusByPaymentId,
  updateStatusByPrefId,
} from '../../infra/repositories/subscriptionRepository';

const router = Router();

const mpClient = env.mpAccessToken
  ? new MercadoPagoConfig({
      accessToken: env.mpAccessToken,
    })
  : null;

const preferenceClient = mpClient ? new Preference(mpClient) : null;
const paymentClient = mpClient ? new Payment(mpClient) : null;

function normalizeBaseUrl(raw: string | undefined, fallback: string) {
  const candidate = (raw || '').trim() || fallback;
  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch (error) {
    console.warn('[billing] Base URL inválida, usando fallback', { raw, fallback, error });
    return new URL(fallback).toString().replace(/\/$/, '');
  }
}

// Criar checkout do Mercado Pago
router.post('/api/billing/create-checkout', async (req, res) => {
  try {
    const { planId, email } = req.body || {};
    const plan = resolvePlan(planId);

    if (!plan) {
      return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Plano inválido.' } });
    }

    if (!email || typeof email !== 'string') {
      return res
        .status(400)
        .json({ error: { code: 'INVALID_EMAIL', message: 'Informe um e-mail válido para a assinatura.' } });
    }

    if (!preferenceClient) {
      return res
        .status(500)
        .json({ error: { code: 'MP_NOT_CONFIGURED', message: 'Mercado Pago não configurado no servidor.' } });
    }

    const frontendBase = normalizeBaseUrl(env.frontendBaseUrl, 'http://localhost:5173');
    const apiBase = normalizeBaseUrl(env.apiBaseUrl, 'http://localhost:4000');
    const backUrls = {
      success: `${frontendBase}/app/assinatura/retorno?status=success`,
      failure: `${frontendBase}/app/assinatura/retorno?status=failure`,
      pending: `${frontendBase}/app/assinatura/retorno?status=pending`,
    };
    const notificationUrl = `${apiBase}/api/billing/webhook/mercadopago`;

    console.log('[billing/create-checkout] back_urls e auto_return', {
      back_urls: backUrls,
      auto_return: 'approved',
      notification_url: notificationUrl,
    });

    const prefBody = {
      items: [
        {
          title: plan.name,
          quantity: 1,
          unit_price: plan.priceCents / 100,
          currency_id: plan.currency,
          id: plan.id,
        },
      ],
      payer: {
        email,
      },
      metadata: {
        planId: plan.id,
        email,
        priceCents: plan.priceCents,
        currency: plan.currency,
      },
      back_urls: backUrls,
      auto_return: 'approved' as const,
      notification_url: notificationUrl,
      payment_methods: {
        excluded_payment_types: [],
        excluded_payment_methods: [],
        default_payment_method_id: 'pix',
      },
      statement_descriptor: 'IMOBI CONTRACT',
    };

    const preference = await preferenceClient.create({ body: prefBody });

    const subscription = await createPendingSubscription({
      email,
      planId: plan.id,
      priceCents: plan.priceCents,
      currency: plan.currency,
      mpPrefId: preference.id,
    });

    const checkoutUrl = preference.init_point || preference.sandbox_init_point;
    console.log('[billing/create-checkout] preference criada:', {
      id: preference.id,
      checkoutUrl,
    });

    return res.json({
      checkoutUrl,
      preferenceId: preference.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('[billing/create-checkout] erro:', error);
    return res.status(500).json({
      error: {
        code: 'CHECKOUT_ERROR',
        message: 'Não foi possível iniciar o checkout no momento.',
      },
    });
  }
});

// Webhook do Mercado Pago
router.post('/api/billing/webhook/mercadopago', async (req, res) => {
  const paymentId =
    (req.query['data.id'] as string) ||
    (req.query.id as string) ||
    req.body?.data?.id ||
    req.body?.data?.payment?.id ||
    req.body?.id;

  if (!paymentId) {
    console.warn('[billing/webhook] Notificação sem paymentId. Body:', req.body);
    return res.status(200).json({ received: true });
  }

  console.log('[billing/webhook] payload recebido', { query: req.query, body: req.body });

  if (!paymentClient) {
    console.error('[billing/webhook] Mercado Pago não configurado (mpAccessToken ausente).');
    return res.status(500).json({ error: { code: 'MP_NOT_CONFIGURED', message: 'MP não configurado.' } });
  }

  try {
    const payment = await paymentClient.get({ id: paymentId.toString() });
    const meta = (payment.metadata || {}) as any;

    const prefId =
      (payment as any).preference_id ||
      (payment.order as any)?.id ||
      (payment as any).metadata?.preference_id ||
      (payment.additional_info as any)?.items?.[0]?.id ||
      meta.prefId;

    const planId = meta.planId || meta.plan_id;
    const email = meta.email || payment.payer?.email || '';
    const transactionAmountCents = Math.round((payment.transaction_amount || 0) * 100);
    const status = payment.status;

    const plan = planId ? resolvePlan(planId) : null;
    let expectedPrice = plan?.priceCents;
    let expectedCurrency: string | undefined = plan?.currency;

    if (!expectedPrice && prefId) {
      const sub = await findByPrefId(prefId);
      if (sub) {
        expectedPrice = sub.priceCents;
        expectedCurrency = sub.currency;
      }
    }

    if (status === 'approved') {
      if (expectedCurrency && payment.currency_id && payment.currency_id !== expectedCurrency) {
        console.warn('[billing/webhook] Moeda divergente. Pago:', payment.currency_id, 'Esperado:', expectedCurrency);
        return res.status(200).json({ ok: true, ignored: 'CURRENCY_MISMATCH' });
      }
      if (expectedPrice && transactionAmountCents !== expectedPrice) {
        console.warn('[billing/webhook] Valor divergente. Pago:', transactionAmountCents, 'Esperado:', expectedPrice);
        return res.status(200).json({ ok: true, ignored: 'AMOUNT_MISMATCH' });
      }

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      await activateSubscriptionByPayment({
        email: email || 'cliente@desconhecido',
        planId: plan?.id || planId || 'desconhecido',
        paymentId: paymentId.toString(),
        priceCents: expectedPrice ?? transactionAmountCents,
        currency: expectedCurrency || (payment.currency_id as string) || 'BRL',
        validUntil,
      });

      return res.status(200).json({ ok: true });
    }

    if (status === 'rejected' || status === 'cancelled') {
      if (paymentId) {
        await updateStatusByPaymentId(paymentId.toString(), status.toUpperCase());
      }
      if (prefId) {
        await updateStatusByPrefId(prefId, status.toUpperCase());
      }
      return res.status(200).json({ ok: true, status });
    }

    return res.status(200).json({ ok: true, status });
  } catch (error) {
    console.error('[billing/webhook] erro:', error);
    return res.status(500).json({
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Erro ao processar webhook do Mercado Pago.',
      },
    });
  }
});

// Status da assinatura por e-mail
router.get('/api/billing/subscription-status', async (req, res) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({
      error: {
        code: 'INVALID_EMAIL',
        message: 'Informe o e-mail para consultar a assinatura.',
      },
    });
  }

  const sub = await findActiveSubscriptionByEmail(email);

  if (!sub) {
    return res.json({
      hasActiveSubscription: false,
    });
  }

  return res.json({
    hasActiveSubscription: true,
    planId: sub.planId,
    validUntil: sub.validUntil,
    status: sub.status,
  });
});

export default router;
