import type { Multer } from 'multer';

// Tipagem explícita do arquivo recebido pelo Multer, sem depender de Express.Multer.*
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

// Alias opcional para instâncias do Multer quando necessário em configs.
export type MulterInstance = Multer;
