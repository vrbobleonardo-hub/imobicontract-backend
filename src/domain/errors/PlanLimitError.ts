export type PlanLimitKind = 'INSPECTION' | 'DOCUMENT' | 'MENTOR_FILE_QUESTION';

export class PlanLimitError extends Error {
  readonly kind: PlanLimitKind;
  readonly limit: number;
  readonly current: number;

  constructor(kind: PlanLimitKind, limit: number, current: number) {
    super(
      kind === 'INSPECTION'
        ? 'Limite mensal de vistorias atingido.'
        : kind === 'DOCUMENT'
          ? 'Limite mensal de documentos atingido.'
          : 'Limite mensal de arquivos analisados pelo Mentor foi atingido.'
    );
    this.name = 'PlanLimitError';
    this.kind = kind;
    this.limit = limit;
    this.current = current;
  }
}
