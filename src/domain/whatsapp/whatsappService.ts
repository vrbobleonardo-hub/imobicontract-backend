import fetch from 'node-fetch';
import { prisma } from '../../infra/db/client';
import { isWhatsappConfigured, whatsappConfig } from '../../config/whatsappConfig';

const normalizePhone = (raw: string) => raw.replace(/\D/g, '');

async function getOrCreateContact(userId: number, phone: string, name?: string) {
  const normalized = normalizePhone(phone);
  const existing = await prisma.whatsappContact.findFirst({ where: { userId, phone: normalized } });
  if (existing) return existing;
  return prisma.whatsappContact.create({ data: { userId, phone: normalized, name } });
}

async function getOrCreateConversation(userId: number, contactId: number) {
  const existing = await prisma.whatsappConversation.findFirst({
    where: { userId, contactId },
  });
  if (existing) return existing;
  return prisma.whatsappConversation.create({ data: { userId, contactId } });
}

async function sendToCloudApi(payload: Record<string, any>): Promise<string> {
  if (!isWhatsappConfigured()) {
    throw new Error('WhatsApp não configurado. Preencha as variáveis do .env.');
  }
  const url = `${whatsappConfig.baseUrl}/${whatsappConfig.phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappConfig.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  let raw = '';
  try {
    raw = await resp.text();
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = raw || {};
  }

  const logContext = {
    status: resp.status,
    statusText: resp.statusText,
    body: data,
  };

  if (!resp.ok) {
    const metaError = data?.error?.error_data?.details || data?.error?.message || raw || `HTTP ${resp.status}`;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[WhatsApp] falha HTTP', logContext);
    }
    throw new Error(metaError);
  }

  if (data?.error) {
    const metaError = data?.error?.error_data?.details || data?.error?.message || 'Erro no WhatsApp Cloud API';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[WhatsApp] erro na resposta', logContext);
    }
    throw new Error(metaError);
  }

  const msgId = data?.messages?.[0]?.id;
  if (!msgId) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[WhatsApp] resposta sem messages[0].id', logContext);
    }
    throw new Error('Resposta do WhatsApp sem messages[0].id');
  }

  return msgId;
}

async function persistOutboundMessage(params: {
  userId: number;
  conversationId: number;
  body: string;
  status: string;
  whatsappMessageId?: string | null;
}) {
  await prisma.whatsappMessage.create({
    data: {
      conversationId: params.conversationId,
      userId: params.userId,
      direction: 'OUTBOUND',
      status: params.status,
      body: params.body,
      whatsappMessageId: params.whatsappMessageId || undefined,
      timestamp: new Date(),
    },
  });
  await prisma.whatsappConversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: new Date() },
  });
}

export async function sendTextMessage(params: {
  userId: number;
  to: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(params.to);
  if (!phone || !params.text?.trim()) {
    return { success: false, error: 'Telefone e texto são obrigatórios para envio.' };
  }
  const contact = await getOrCreateContact(params.userId, phone);
  const conversation = await getOrCreateConversation(params.userId, contact.id);

  try {
    const msgId = await sendToCloudApi({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: params.text },
    });

    await persistOutboundMessage({
      userId: params.userId,
      conversationId: conversation.id,
      body: params.text,
      status: 'SENT',
      whatsappMessageId: msgId,
    });
    return { success: true };
  } catch (err: any) {
    await persistOutboundMessage({
      userId: params.userId,
      conversationId: conversation.id,
      body: params.text,
      status: 'FAILED',
      whatsappMessageId: null,
    });
    return { success: false, error: err?.message || 'Falha ao enviar mensagem via WhatsApp.' };
  }
}

export async function sendHelloWorldTemplate(params: { userId: number; to: string }): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(params.to);
  if (!phone) return { success: false, error: 'Telefone inválido.' };
  const contact = await getOrCreateContact(params.userId, phone);
  const conversation = await getOrCreateConversation(params.userId, contact.id);

  try {
    const msgId = await sendToCloudApi({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    });
    await persistOutboundMessage({
      userId: params.userId,
      conversationId: conversation.id,
      body: 'hello_world template',
      status: 'SENT',
      whatsappMessageId: msgId,
    });
    return { success: true };
  } catch (err: any) {
    await persistOutboundMessage({
      userId: params.userId,
      conversationId: conversation.id,
      body: 'hello_world template',
      status: 'FAILED',
      whatsappMessageId: null,
    });
    return { success: false, error: err?.message || 'Falha ao enviar template hello_world.' };
  }
}

export async function handleIncomingWebhook(payload: any): Promise<void> {
  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const messages = change?.value?.messages;
    const contacts = change?.value?.contacts;
    if (!messages || !contacts || !messages.length || !contacts.length) {
      console.warn('[WhatsApp webhook] payload sem mensagens válidas');
      return;
    }

    const msg = messages[0];
    const contact = contacts[0];
    const fromPhone = normalizePhone(msg.from || contact.wa_id || '');
    const text = msg.text?.body || '';
    const whatsappMessageId = msg.id;
    const timestampSeconds = msg.timestamp ? Number(msg.timestamp) : Date.now() / 1000;
    const ts = new Date(timestampSeconds * 1000);

    // TODO: mapear userId dinamicamente; por ora, ambiente dev usa userId fixo.
    const userId = 1;

    const dbContact = await getOrCreateContact(userId, fromPhone, contact.profile?.name);
    const conversation = await getOrCreateConversation(userId, dbContact.id);

    await prisma.whatsappMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        direction: 'INBOUND',
        status: 'RECEIVED',
        body: text,
        whatsappMessageId,
        timestamp: ts,
      },
    });

    await prisma.whatsappConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: ts },
    });
  } catch (err) {
    console.error('[WhatsApp webhook] erro ao processar payload', err);
  }
}
