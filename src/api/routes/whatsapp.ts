import { Router } from 'express';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { prisma } from '../../infra/db/client';
import { handleIncomingWebhook, sendHelloWorldTemplate, sendTextMessage } from '../../domain/whatsapp/whatsappService';
import { missingWhatsappConfig, whatsappConfig } from '../../config/whatsappConfig';

export const whatsappRouter = Router();

whatsappRouter.post('/send', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const { to, text } = req.body || {};
  if (!to || !text) {
    return res.status(400).json({ ok: false, error: 'Informe telefone (to) e o texto.' });
  }

  const result = await sendTextMessage({ userId, to, text });
  if (!result.success) {
    return res.status(502).json({ ok: false, error: result.error || 'Falha ao enviar.' });
  }
  return res.json({ ok: true });
});

whatsappRouter.get('/health', (_req, res) => {
  const missing = missingWhatsappConfig();
  res.json({ ok: true, configured: missing.length === 0, missing });
});

whatsappRouter.post('/test', async (_req, res) => {
  const to = process.env.WHATSAPP_TEST_TO;
  if (!to) return res.status(400).json({ ok: false, error: 'WHATSAPP_TEST_TO não configurado.' });
  const result = await sendTextMessage({
    userId: 1,
    to,
    text: 'Teste ImobiContract via WhatsApp Cloud API',
  });
  if (!result.success) return res.status(502).json({ ok: false, error: result.error });
  return res.json({ ok: true });
});

whatsappRouter.post('/test', async (_req, res) => {
  const to = process.env.WHATSAPP_TEST_TO;
  if (!to) return res.status(400).json({ ok: false, error: 'WHATSAPP_TEST_TO não configurado.' });
  const result = await sendHelloWorldTemplate({ userId: 1, to });
  if (!result.success) return res.status(500).json({ ok: false, error: result.error });
  return res.json({ ok: true });
});

whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === whatsappConfig.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

whatsappRouter.post('/webhook', async (req, res) => {
  await handleIncomingWebhook(req.body);
  res.json({ received: true });
});

whatsappRouter.get('/contacts', async (_req, res) => {
  const userId = getCurrentUserIdDev();
  const contacts = await prisma.whatsappContact.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(contacts);
});

whatsappRouter.get('/conversations', async (_req, res) => {
  const userId = getCurrentUserIdDev();
  const conversations = await prisma.whatsappConversation.findMany({
    where: { userId },
    include: { contact: true },
    orderBy: { lastMessageAt: 'desc' },
  });
  res.json(
    conversations.map((c) => ({
      id: c.id,
      contact: { id: c.contact.id, phone: c.contact.phone, name: c.contact.name },
      label: c.label,
      lastMessageAt: c.lastMessageAt,
    }))
  );
});

whatsappRouter.get('/conversations/:id/messages', async (req, res) => {
  const userId = getCurrentUserIdDev();
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: { message: 'ID inválido.' } });

  const conversation = await prisma.whatsappConversation.findFirst({ where: { id, userId } });
  if (!conversation) return res.status(404).json({ error: { message: 'Conversa não encontrada.' } });

  const messages = await prisma.whatsappMessage.findMany({
    where: { conversationId: id, userId },
    orderBy: { timestamp: 'asc' },
  });
  res.json(messages);
});

export default whatsappRouter;
