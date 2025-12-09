import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPlanLimits } from '../domain/billing/planLimits';

// Use the highest allowed size among plans (currently 10MB)
const MAX_ATTACHMENT_SIZE_MB = Math.max(
  getPlanLimits('STARTER').maxAttachmentSizeMb,
  getPlanLimits('PRO').maxAttachmentSizeMb,
  getPlanLimits('IMOBILIARIA').maxAttachmentSizeMb
);

const uploadDir = path.resolve(process.cwd(), 'uploads', 'mentor');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).userId || 'anon';
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const unique = `${userId}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}_${unique}${ext}`);
  },
});

const allowedMimes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Tipo de arquivo não permitido. Envie PDF, imagens (jpg, png, webp, heic) ou textos/docx.'
      )
    );
  }
}

export const mentorUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_MB * 1024 * 1024,
    files: 3,
  },
});
