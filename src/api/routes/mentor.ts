import { Router } from 'express';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { askGemini } from '../../ai/geminiClient';
import { getCurrentUserIdDev } from '../../middleware/authDev';
import { mentorUpload } from '../../config/uploadMentor';
import { prisma } from '../../infra/db/client';
import {
  checkMentorFileQuestionLimit,
  getMentorFileUsage,
  incrementMentorFileQuestionUsage,
} from '../../domain/billing/usageService';
import { PlanLimitError } from '../../domain/errors/PlanLimitError';
import { UploadedFile } from '../../types/uploads';

const router = Router();

const setUserMiddleware = (req: any, _res: any, next: any) => {
  req.userId = getCurrentUserIdDev();
  next();
};

router.get('/usage', setUserMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const usage = await getMentorFileUsage(userId);
    res.json(usage);
  } catch (err) {
    console.error('[mentor usage] erro', err);
    res.status(500).json({ error: 'Não foi possível obter o uso do Mentor.' });
  }
});

router.post('/ask', setUserMiddleware, mentorUpload.array('attachments', 3), async (req, res) => {
  try {
    const userId = (req as any).userId as number;
    const question = (req.body?.question || '').toString().trim();
    const files = (req.files as UploadedFile[]) || [];

    if (!question) {
      return res.status(400).json({ error: 'Informe uma pergunta em "question".' });
    }

    if (files.length) {
      try {
        await checkMentorFileQuestionLimit(userId, files.length);
      } catch (err) {
        if (err instanceof PlanLimitError) {
          return res.status(403).json({ error: err.message, code: 'PLAN_LIMIT_MENTOR_FILE' });
        }
        throw err;
      }
    }

    const attachmentSummaries: string[] = [];
    const attachmentsResponse: Array<{ id: number; originalName: string; mimeType: string }> = [];

    for (const file of files) {
      const stored = await prisma.mentorAttachment.create({
        data: {
          userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          storagePath: file.path,
        },
      });

      attachmentsResponse.push({
        id: stored.id,
        originalName: stored.originalName,
        mimeType: stored.mimeType,
      });

      if (file.mimetype === 'application/pdf') {
        try {
          const data = await pdfParse(fs.readFileSync(file.path));
          const text = (data.text || '').trim();
          if (text) {
            attachmentSummaries.push(`Conteúdo extraído do PDF "${file.originalname}":\n${text}`);
          } else {
            attachmentSummaries.push(`PDF "${file.originalname}" sem texto extraível.`);
          }
        } catch (err) {
          console.error('[mentor upload] erro ao ler PDF', err);
          attachmentSummaries.push(`PDF "${file.originalname}" não pôde ser lido. Considere reenviar.`);
        }
      } else if (file.mimetype === 'text/plain') {
        try {
          const content = fs.readFileSync(file.path, 'utf-8');
          attachmentSummaries.push(`Conteúdo do arquivo texto "${file.originalname}":\n${content}`);
        } catch (err) {
          console.error('[mentor upload] erro ao ler TXT', err);
          attachmentSummaries.push(`Arquivo texto "${file.originalname}" não pôde ser lido.`);
        }
      } else if (
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        attachmentSummaries.push(
          `Arquivo Word recebido: ${file.originalname} (tipo ${file.mimetype}, ${file.size} bytes).`
        );
      } else {
        attachmentSummaries.push(
          `Imagem enviada: ${file.originalname} (tipo ${file.mimetype}, tamanho ${file.size} bytes).`
        );
      }
    }

    const attachmentsText =
      attachmentSummaries.length > 0
        ? `Se aplicável, use também o conteúdo abaixo extraído dos arquivos em anexo:\n${attachmentSummaries.join('\n\n')}`
        : '';

    const prompt = `
Você é o Mentor Jurídico do ImobiContract. Responda em português claro, com parágrafos bem espaçados e markdown limpo (sem mostrar os asteriscos).

Pergunta do usuário:
${question}

${attachmentsText}
`.trim();

    const reply = await askGemini({ mode: 'mentor', message: prompt });

    if (files.length) {
      await incrementMentorFileQuestionUsage(userId, files.length);
    }

    return res.json({ answer: reply, attachments: attachmentsResponse });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return res.status(403).json({ error: err.message, code: 'PLAN_LIMIT_MENTOR_FILE' });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[mentor ask] erro', err);
    return res.status(500).json({ error: 'Erro ao processar pergunta do Mentor.' });
  }
});

export default router;
