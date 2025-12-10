import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { askGemini, ChatMode, checkGeminiHealth } from './ai/geminiClient';
import contractRoutes from './api/routes/contracts';
import notificationRoutes from './api/routes/notifications';
import inspectionRoutes from './api/routes/inspections';
import dashboardRoutes from './api/routes/dashboard';
import inspectionsAnalyzeRoutes from './api/routes/inspectionsAnalyze';
import inspectionReportPdfRoutes from './api/routes/inspectionReportPdf';
import propertiesRoutes from './api/routes/properties';
import overviewRoutes from './api/routes/overview';
import billingRoutes from './api/routes/billing';
import usageRoutes from './api/routes/usage';
import tenantRoutes from './api/routes/tenants';
import landlordRoutes from './api/routes/landlords';
import appSettingsRoutes from './api/routes/appSettings';
import { whatsappRouter } from './api/routes/whatsapp';
import { env } from './config/env';
import mentorRoutes from './api/routes/mentor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [env.frontendBaseUrl].filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use(contractRoutes);
app.use(notificationRoutes);
app.use(inspectionRoutes);
app.use(dashboardRoutes);
app.use(inspectionsAnalyzeRoutes);
app.use(inspectionReportPdfRoutes);
app.use(propertiesRoutes);
app.use(overviewRoutes);
app.use(billingRoutes);
app.use(usageRoutes);
app.use(tenantRoutes);
app.use(landlordRoutes);
app.use(appSettingsRoutes);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/mentor', mentorRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.send('🚀 ImobiContract Backend Online!');
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'imobicontract-backend',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

app.post('/api/chat', async (req, res) => {
  const { message, mode } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Campo "message" é obrigatório e deve ser uma string.',
      },
    });
  }

  const allowedModes: ChatMode[] = ['mentor', 'contract', 'notification', 'inspection'];
  const safeMode: ChatMode = allowedModes.includes(mode) ? mode : 'mentor';

  const fallbackReplies: Record<ChatMode, string> = {
    mentor: 'Sou o Mentor Jurídico. Posso orientar sobre Lei do Inquilinato, Código Civil e CPC.',
    contract:
      'Aqui vou te ajudar a gerar um rascunho de contrato. Informe tipo, partes e endereço que sugiro cláusulas.',
    notification:
      'Aqui vou te ajudar a gerar uma notificação. Diga destinatário, assunto e contexto que monto um texto base.',
    inspection:
      'Aqui vou te ajudar a montar uma vistoria. Diga endereço, tipo (entrada/saída) e pontos principais.',
  };

  try {
    const reply = await askGemini({ mode: safeMode, message });
    return res.json({ reply, mode: safeMode, source: 'gemini' });
  } catch (err) {
    console.error('[API /api/chat] Gemini error:', {
      error: (err as Error)?.message || err,
      mode: safeMode,
      message,
    });
    const reply =
      (fallbackReplies[safeMode] || fallbackReplies.mentor) + ' (resposta genérica por fallback).';
    return res.json({
      reply,
      mode: safeMode,
      source: 'fallback',
      error: (err as Error)?.message || 'Falha ao consultar o Gemini. Ajuste GEMINI_MODEL se necessário.',
    });
  }
});

app.get('/health/gemini', (_req: Request, res: Response) => {
  checkGeminiHealth()
    .then((status) => res.json({ ...status, status: status.ok ? 'ok' : 'degraded' }))
    .catch((err: Error) => {
      console.error('[health/gemini] error:', err.message);
      res.json({
        ok: false,
        hasKey: Boolean(process.env.GOOGLE_API_KEY),
        message: 'Falha ao checar Gemini.',
        status: 'degraded',
      });
    });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno no servidor.',
    },
  });
});
