import { Router } from 'express';
import multer from 'multer';
import { MissingGoogleKeyError, analyzeInspectionImagesWithGemini } from '../../ai/geminiClient';
import { validateRequiredFields } from '../../utils';
import { UploadedFile } from '../../types/uploads';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB por imagem para evitar uploads gigantes
    files: 10,
  },
});

router.post('/api/inspections/analyze', upload.array('files'), async (req: any, res) => {
  try {
    const { endereco, tipo, observacoes } = req.body || {};

    const missing = validateRequiredFields(req.body, ['endereco', 'tipo']);
    if (missing.length) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: endereco, tipo.',
          fields: missing,
        },
      });
    }

    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Envie ao menos uma imagem em "files".',
        },
      });
    }

    const ambientes = Array.isArray(req.body.ambientes)
      ? req.body.ambientes
      : typeof req.body.ambientes === 'string'
      ? [req.body.ambientes]
      : [];

    const notas = Array.isArray(req.body.notas)
      ? req.body.notas
      : typeof req.body.notas === 'string'
      ? [req.body.notas]
      : [];

    const metadata = {
      locadores: Array.isArray(req.body.locadores) ? req.body.locadores : undefined,
      locatarios: Array.isArray(req.body.locatarios) ? req.body.locatarios : undefined,
      cidadeUf: typeof req.body.cidadeUf === 'string' ? req.body.cidadeUf : undefined,
      tipoVistoria: typeof req.body.tipoVistoria === 'string' ? req.body.tipoVistoria : undefined,
      objetoVistoria: typeof req.body.objetoVistoria === 'string' ? req.body.objetoVistoria : undefined,
    };

    const images = (req.files as UploadedFile[]).map((file: UploadedFile, idx: number) => {
      const base64 = file.buffer.toString('base64'); // sem prefixo data:
      return {
        fotoId: file.originalname || `foto-${idx + 1}`,
        mimeType: file.mimetype,
        base64,
        ambiente: ambientes[idx] || '',
        nota: notas[idx] || '',
      };
    });

    console.log(`[inspections/analyze] endereco=${endereco} tipo=${tipo} imagens=${images.length}`);

    const result = await analyzeInspectionImagesWithGemini({
      tipo,
      endereco,
      observacoes,
      metadata,
      images,
    });

    return res.json(result);
  } catch (err) {
    console.error('[Inspections Analyze] Erro inesperado:', err);
    const message =
      err instanceof MissingGoogleKeyError
        ? 'Configure a GOOGLE_API_KEY antes de usar a análise por IA.'
        : 'Não foi possível analisar as fotos com IA no momento. Tente novamente em instantes.';
    const code = err instanceof MissingGoogleKeyError ? 'MISSING_GOOGLE_KEY' : 'AI_ANALYZE_ERROR';
    return res.status(500).json({
      error: {
        code,
        message,
        debugReason: (err as Error)?.message,
      },
    });
  }
});

export default router;
