import dotenv from 'dotenv';

dotenv.config();

export type AiTask = 'mentor' | 'contract' | 'inspection' | 'summary' | 'notification';

const DEFAULT_MODELS: Record<AiTask, string> = {
  mentor: 'gemini-2.5-flash-live',
  contract: 'gemini-2.5-flash',
  inspection: 'gemini-2.5-flash',
  summary: 'gemini-2.5-flash-lite',
  notification: 'gemini-2.5-flash',
};

const ENV_KEYS: Record<
  AiTask,
  {
    primary: string;
    fallback?: string;
  }
> = {
  mentor: { primary: 'GEMINI_MODEL_MENTOR', fallback: 'GEMINI_MODEL_MENTOR_FALLBACK' },
  contract: { primary: 'GEMINI_MODEL_CONTRACT', fallback: 'GEMINI_MODEL_CONTRACT_FALLBACK' },
  inspection: { primary: 'GEMINI_MODEL_VISTORIA', fallback: 'GEMINI_MODEL_VISTORIA_FALLBACK' },
  summary: { primary: 'GEMINI_MODEL_SUMMARY', fallback: 'GEMINI_MODEL_SUMMARY_FALLBACK' },
  notification: { primary: 'GEMINI_MODEL_NOTIFICATION', fallback: 'GEMINI_MODEL_NOTIFICATION_FALLBACK' },
};

function env(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function getModelCandidates(task: AiTask): string[] {
  const keys = ENV_KEYS[task];
  const primary = env(keys.primary) ?? env('GEMINI_MODEL');
  const fallback = keys.fallback ? env(keys.fallback) : undefined;
  const genericFallback = env('GEMINI_MODEL_FALLBACK');
  const defaults = DEFAULT_MODELS[task];

  const list = [primary, fallback, genericFallback, defaults].filter(Boolean) as string[];
  // remove duplicados preservando ordem
  return Array.from(new Set(list));
}

export function logAiConfigWarnings(): void {
  if (process.env.NODE_ENV === 'production') return;
  const tasks: AiTask[] = ['mentor', 'contract', 'inspection', 'summary', 'notification'];
  tasks.forEach((task) => {
    const { primary } = ENV_KEYS[task];
    if (!env(primary)) {
      // eslint-disable-next-line no-console
      console.warn(`[aiConfig] Variável ${primary} não definida. Usando default ${DEFAULT_MODELS[task]}.`);
    }
  });
}

export function getDefaultModel(task: AiTask): string {
  return DEFAULT_MODELS[task];
}
