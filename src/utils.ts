import { Response } from 'express';

export function validateRequiredFields(
  body: Record<string, unknown> | undefined | null,
  requiredFields: string[]
): string[] {
  if (!body) return requiredFields;
  return requiredFields.filter((field) => {
    const value = (body as Record<string, unknown>)[field];
    return value === undefined || value === null || value === '';
  });
}

export function sendValidationError(
  res: Response,
  fields: string[],
  message = 'Campos obrigatórios ausentes.'
) {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      fields,
    },
  });
}
