import dotenv from 'dotenv';

dotenv.config();

export type WhatsappConfig = {
  baseUrl: string;
  phoneNumberId: string;
  apiToken: string;
  webhookVerifyToken: string;
};

function readEnv(): WhatsappConfig {
  const baseUrl = process.env.WHATSAPP_API_BASE_URL || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const apiToken = process.env.WHATSAPP_API_TOKEN || '';
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';

  const missing: string[] = [];
  if (!baseUrl) missing.push('WHATSAPP_API_BASE_URL');
  if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!apiToken) missing.push('WHATSAPP_API_TOKEN');
  if (!webhookVerifyToken) missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');

  if (missing.length) {
    console.warn(
      `[whatsappConfig] Variáveis faltando: ${missing.join(
        ', '
      )}. Envio/recepção de mensagens não funcionará até configurar.`
    );
  }

  return { baseUrl, phoneNumberId, apiToken, webhookVerifyToken };
}

export const whatsappConfig = readEnv();

export function isWhatsappConfigured(): boolean {
  return Boolean(whatsappConfig.baseUrl && whatsappConfig.phoneNumberId && whatsappConfig.apiToken);
}

export function missingWhatsappConfig(): string[] {
  const missing: string[] = [];
  if (!whatsappConfig.baseUrl) missing.push('WHATSAPP_API_BASE_URL');
  if (!whatsappConfig.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!whatsappConfig.apiToken) missing.push('WHATSAPP_API_TOKEN');
  if (!whatsappConfig.webhookVerifyToken) missing.push('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  return missing;
}
