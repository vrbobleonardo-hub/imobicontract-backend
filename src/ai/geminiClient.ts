import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiTask, getDefaultModel, getModelCandidates, logAiConfigWarnings } from '../config/aiConfig';

dotenv.config();

export type ChatMode = 'mentor' | 'contract' | 'notification' | 'inspection';
type GeminiHealthStatus = 'ok' | 'degraded';

export type InspectionDamage = {
  tipo: string;
  severidade: 'leve' | 'moderado' | 'grave';
  descricao: string;
  acaoRecomendada: string;
};

export type InspectionPhotoAnalysis = {
  fotoId: string;
  ambiente: string;
  descricao: string;
  danos: InspectionDamage[];
};

export type InspectionVisionOutput = {
  source: 'gemini' | 'fallback';
  laudoGeral: string;
  fotos: InspectionPhotoAnalysis[];
  header?: any;
  resumoGeral?: string;
  ambientes?: any[];
  debugReason?: string;
};

export interface AiInspectionReport {
  header?: {
    tipoVistoria?: string;
    data?: string;
    cidadeUf?: string;
    enderecoImovel?: string;
    locadores?: string[];
    locatarios?: string[];
    objetoVistoria?: string;
    resumo?: string;
  };
  resumoGeral?: string;
  ambientes?: Array<{
    ambiente?: string;
    resumoAmbiente?: string;
    itens?: Array<{
      item?: string;
      estadoGeral?: string;
      haDanos?: boolean;
      severidade?: string;
      descricaoDanos?: string;
      possiveisCausas?: string;
      riscosSeNaoTratar?: string;
      acaoRecomendada?: string;
    }>;
  }>;
  fotos?: Array<{
    fotoId?: string;
    fileName?: string;
    fileUrl?: string;
    ambiente?: string;
    itemRelacionado?: string;
    resumoCurto?: string;
    severidade?: string;
    descricaoDanos?: string;
    possiveisCausas?: string;
    riscosSeNaoTratar?: string;
    acaoRecomendada?: string;
    previewDataUrl?: string;
  }>;
}

export class MissingGoogleKeyError extends Error {
  constructor() {
    super('GOOGLE_API_KEY não configurada');
    this.name = 'MissingGoogleKeyError';
  }
}

const API_KEY = process.env.GOOGLE_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const isDev = process.env.NODE_ENV !== 'production';

logAiConfigWarnings();

const SYSTEM_PROMPT_BASE = `
Você é o Imobi Contract Legal Mentor, um advogado virtual especializado em direito imobiliário brasileiro (Lei do Inquilinato 8.245/1991, Código Civil e CPC).

Instruções gerais:
- Responda SEMPRE em português claro, com tom profissional e sem juridiquês desnecessário.
- Nunca invente artigos ou leis; se não tiver certeza, diga para consultar a legislação ou um advogado local.
- Oriente corretores, proprietários, locatários e imobiliárias em cenários de locação residencial e comercial.
- As respostas são apoio e não substituem parecer jurídico formal; lembre disso de forma breve.
`.trim();

function buildModeInstruction(mode: ChatMode | 'summary'): string {
  switch (mode) {
    case 'contract':
      return 'Modo CONTRATO: sugira um esqueleto de cláusulas (partes, objeto, prazo, valor/garantias, obrigações, reajuste, rescisão, vistoria). Seja conciso e estruturado.';
    case 'notification':
      return 'Modo NOTIFICAÇÃO: sugira um corpo breve (saudação, contexto, fundamento, pedido/prazo, consequência). Tom firme e respeitoso.';
    case 'inspection':
      return 'Modo VISTORIA: ofereça checklist de ambientes (piso, pintura, portas/janelas, elétrica, hidráulica, fotos).';
    case 'summary':
      return 'Modo RESUMO: produza resposta curta e direta, priorizando bullets objetivos.';
    case 'mentor':
    default:
      return 'Modo MENTOR: explique conceito, riscos e próximos passos práticos para locação residencial/comercial.';
  }
}

function buildPrompt(mode: ChatMode | 'summary', message: string): string {
  return `
${SYSTEM_PROMPT_BASE}

${buildModeInstruction(mode)}

Pergunta do usuário:
"${message}"

Responda em português do Brasil, de forma estruturada, em tópicos quando fizer sentido, direta e prática.
Reforce segurança jurídica e lembre que um advogado deve revisar antes de uso com cliente.
`.trim();
}

const SYSTEM_PROMPT_INSPECTION = `
Você é um perito de vistorias imobiliárias (locação no Brasil), com foco técnico (não jurídico).
- Analise fotos de vistoria de entrada, saída ou cautelar.
- Sempre descreva o ambiente/móvel de forma neutra, mesmo quando não houver danos.
- Identifique danos visíveis: pintura, piso, azulejos, portas, janelas, vidros, armários, hidráulica aparente, elétrica aparente, infiltração, mofo, rachaduras, riscos, amassados, ferrugem.
- Classifique severidade como "sem_danos", "leve", "moderado" ou "grave".
- Recomende ações práticas: pintar, trocar peça, revisar elétrica/hidráulica, secar e tratar mofo, substituir componente, solicitar vistoria presencial.
- Seja conservador: use "aparente" ou "indício de" quando não houver certeza e recomende verificação presencial.
- Responda SEMPRE em português do Brasil, em JSON estrito no formato solicitado.
- Não faça afirmações jurídicas ou garantias; apenas orientação técnica.
`.trim();

function isQuotaError(err: unknown): boolean {
  const message = (err as any)?.message?.toString()?.toLowerCase?.() || '';
  const status = (err as any)?.status || (err as any)?.cause?.status;
  if (status === 429) return true;
  if (message.includes('quota') || message.includes('exceeded') || message.includes('resource_exhausted')) return true;
  return false;
}

async function generateWithModel(model: string, prompt: string): Promise<string> {
  if (!genAI || !API_KEY) throw new MissingGoogleKeyError();
  const client = genAI.getGenerativeModel({ model });
  const result = await client.generateContent(prompt);
  const text = result.response.text().trim();
  if (!text) throw new Error('EMPTY_GEMINI_RESPONSE');
  return text;
}

async function runWithModels<T>(
  task: AiTask,
  candidates: string[],
  executor: (model: string) => Promise<T>
): Promise<{ data: T; modelUsed: string }> {
  if (!genAI || !API_KEY) throw new MissingGoogleKeyError();
  let lastError: Error | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    if (!model) continue;
    try {
      const data = await executor(model);
      return { data, modelUsed: model };
    } catch (err) {
      lastError = err as Error;
      const quota = isQuotaError(err);
      const hasFallback = i < candidates.length - 1;
      if (quota && hasFallback) {
        if (isDev) {
          console.warn(`[Gemini] quota/rate limit no modelo "${model}". Tentando fallback "${candidates[i + 1]}".`);
        }
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error(`Falha ao consultar o Gemini para tarefa ${task}.`);
}

export async function generateText(task: AiTask, prompt: string): Promise<{ text: string; modelUsed: string }> {
  const candidates = getModelCandidates(task);
  const { data, modelUsed } = await runWithModels(task, candidates, (model) => generateWithModel(model, prompt));
  return { text: data, modelUsed };
}

export async function generateStreaming(
  task: AiTask,
  prompt: string,
  onChunk: (text: string) => void
): Promise<{ modelUsed: string }> {
  const candidates = getModelCandidates(task);
  const { modelUsed } = await runWithModels(task, candidates, async (model) => {
    if (!genAI || !API_KEY) throw new MissingGoogleKeyError();
    const client = genAI.getGenerativeModel({ model });
    const stream = await client.generateContentStream(prompt);
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) onChunk(text);
    }
    return true;
  });
  return { modelUsed };
}

function extractJson(text: string): any {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  const jsonSlice = first >= 0 && last > first ? text.slice(first, last + 1) : text;
  return JSON.parse(jsonSlice);
}

type InspectionImageInput = {
  fotoId: string;
  mimeType: string;
  base64: string;
  ambiente?: string;
  nota?: string;
};

export async function analyzeInspectionImagesWithGemini(params: {
  endereco: string;
  tipo: string;
  observacoes?: string;
  metadata?: {
    locadores?: string[];
    locatarios?: string[];
    cidadeUf?: string;
    tipoVistoria?: string;
    objetoVistoria?: string;
  };
  images: InspectionImageInput[];
}): Promise<InspectionVisionOutput> {
  if (!genAI || !API_KEY) {
    throw new MissingGoogleKeyError();
  }

  const parts: any[] = [
    {
      text: `${SYSTEM_PROMPT_INSPECTION}

Dados da vistoria:
- Endereço: ${params.endereco}
- Tipo de vistoria: ${params.tipo}
- Observações gerais: ${params.observacoes || 'Nenhuma'}
- Locadores: ${(params.metadata?.locadores || ['não informado']).join(', ')}
- Locatários: ${(params.metadata?.locatarios || ['não informado']).join(', ')}
- Cidade/UF: ${params.metadata?.cidadeUf || 'não informada'}
- Tipo de vistoria (entrada/saída): ${params.metadata?.tipoVistoria || 'não informado'}
- Objeto da vistoria: ${params.metadata?.objetoVistoria || 'não informado'}

Analise as fotos a seguir e produza um LAUDO rico. Responda APENAS com JSON neste formato:
{
  "header": {
    "tipoVistoria": "ENTRADA|SAIDA|VISTORIA_AVULSA",
    "data": "string",
    "cidadeUf": "string",
    "enderecoImovel": "string",
    "locadores": ["string"],
    "locatarios": ["string"],
    "objetoVistoria": "string"
  },
  "resumoGeral": "2 a 3 parágrafos detalhando estado geral, pontos críticos e recomendações",
  "ambientes": [
    {
      "ambiente": "Sala|Cozinha|Quarto 1|Banheiro social|Área de serviço|etc",
      "resumoAmbiente": "parágrafo descrevendo acabamentos, iluminação, conservação",
      "itens": [
        {
          "item": "Armário|Piso|Paredes|Teto|Porta|Janela|Bancada|Louça sanitária|Metais|etc",
          "estadoGeral": "descrição neutra e detalhada, mesmo sem danos",
          "haDanos": true|false,
          "severidade": "sem_danos|leve|moderado|grave",
          "descricaoDanos": "detalhes do dano se existir",
          "possiveisCausas": "causas prováveis",
          "riscosSeNaoTratar": "o que pode acontecer se não corrigir",
          "acaoRecomendada": "passo a passo curto do reparo/prioridade"
        }
      ]
    }
  ],
  "fotos": [
    {
      "fotoId": "string",
      "ambiente": "string",
      "itemRelacionado": "string opcional",
      "resumoCurto": "1-2 frases sobre o que a foto mostra",
      "severidade": "sem_danos|leve|moderado|grave",
      "descricaoDanos": "se houver",
      "possiveisCausas": "se houver",
      "riscosSeNaoTratar": "se houver",
      "acaoRecomendada": "se houver"
    }
  ]
}
Regras: sempre descreva o ambiente mesmo sem dano; use textos técnicos e detalhados, estruturados nos campos (não junte tudo em um bloco único).
`,
    },
  ];

  for (const img of params.images) {
    parts.push({
      text: `Foto ${img.fotoId} | ambiente: ${img.ambiente ?? 'não informado'} | nota: ${img.nota ?? 'sem nota'}`,
    });
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType,
      },
    });
  }

  const candidates = getModelCandidates('inspection');
  const { data: response, modelUsed } = await runWithModels(
    'inspection',
    candidates,
    async (model) => {
      if (!genAI || !API_KEY) throw new MissingGoogleKeyError();
      const client = genAI.getGenerativeModel({ model });
      const result = await client.generateContent({ contents: [{ role: 'user', parts }] });
      return result.response;
    }
  );

  const rawText = response.text();
  if (!rawText) {
    throw new Error('EMPTY_GEMINI_RESPONSE');
  }

  let parsed: AiInspectionReport;
  try {
    parsed = extractJson(rawText) as AiInspectionReport;
  } catch (error) {
    console.error('[Gemini Vision] Erro ao parsear JSON:', error);
    throw new Error('AI_JSON_PARSE_ERROR');
  }

  if (!parsed || typeof parsed !== 'object') {
    console.error('[Gemini Vision] Resposta fora do formato esperado:', parsed);
    throw new Error('AI_INVALID_SHAPE');
  }

  const imageLookup = params.images.reduce<Record<string, InspectionImageInput>>((acc, img) => {
    acc[img.fotoId] = img;
    return acc;
  }, {});

  const fotosRaw = Array.isArray(parsed.fotos)
    ? parsed.fotos
    : Array.isArray((parsed as any).photos)
      ? (parsed as any).photos
      : [];

  const normalizedFotos = fotosRaw.map((foto: any, idx: number) => {
    const originalImage = imageLookup[foto.fotoId] || params.images[idx];
    const previewDataUrl =
      foto.previewDataUrl ||
      (originalImage ? `data:${originalImage.mimeType};base64,${originalImage.base64}` : undefined);
    const severidade = foto.severidade || (foto.danos && foto.danos[0]?.severidade) || 'sem_danos';
    const danoPrincipal =
      (Array.isArray(foto.danos) && foto.danos.length && foto.danos[0]) || foto.principalDano || null;
    return {
      fotoId: foto.fotoId || originalImage?.fotoId || `foto-${idx + 1}`,
      fileName: originalImage?.fotoId || `foto-${idx + 1}`,
      fileUrl: foto.fileUrl || previewDataUrl,
      ambiente: foto.ambiente || originalImage?.ambiente || 'Ambiente',
      itemRelacionado: foto.itemRelacionado || null,
      resumoCurto: foto.resumoCurto || foto.descricaoAmbiente || foto.descricao || 'Ambiente sem descrição detalhada.',
      descricaoDanos: foto.descricaoDanos || danoPrincipal?.descricao || null,
      possiveisCausas: foto.possiveisCausas || null,
      riscosSeNaoTratar: foto.riscosSeNaoTratar || null,
      acaoRecomendada: foto.acaoRecomendada || danoPrincipal?.acaoRecomendada || null,
      severidade,
      previewDataUrl,
    };
  });

  const header = parsed.header || {
    tipoVistoria: params.metadata?.tipoVistoria || 'VISTORIA_AVULSA',
    data: new Date().toISOString(),
    cidadeUf: params.metadata?.cidadeUf || 'não informada',
    enderecoImovel: params.endereco,
    locadores: params.metadata?.locadores || ['não informado'],
    locatarios: params.metadata?.locatarios || ['não informado'],
    objetoVistoria: params.metadata?.objetoVistoria || params.endereco,
  };

  const laudoText =
    parsed.resumoGeral || (parsed as any).laudoGeral || parsed.header?.resumo || parsed.ambientes?.[0]?.resumoAmbiente;

  return {
    source: 'gemini',
    laudoGeral: laudoText || 'Análise automática da vistoria.',
    resumoGeral: parsed.resumoGeral || (parsed as any).laudoGeral || laudoText,
    header,
    ambientes: Array.isArray(parsed.ambientes) ? parsed.ambientes : [],
    fotos: normalizedFotos,
    debugReason: `model=${modelUsed}`,
  };
}

export async function askGemini(params: { message: string; mode: ChatMode }): Promise<string> {
  const { mode, message } = params;

  if (!API_KEY) {
    throw new MissingGoogleKeyError();
  }

  const prompt = buildPrompt(mode, message);
  const { text } = await generateText(mode, prompt);
  return text;
}

export async function checkGeminiHealth(): Promise<{
  ok: boolean;
  hasKey: boolean;
  message: string;
  model?: string;
  status: GeminiHealthStatus;
}> {
  const hasKey = Boolean(API_KEY);
  if (!hasKey) {
    return {
      ok: false,
      hasKey,
      message: 'Gemini não configurado. Defina GOOGLE_API_KEY.',
      model: getDefaultModel('summary'),
      status: 'degraded',
    };
  }

  try {
    const prompt = 'Responda apenas "pong"';
    const { text, modelUsed } = await generateText('summary', prompt);
    const ok = text.toLowerCase().includes('pong');
    return {
      ok,
      hasKey,
      message: ok ? 'Gemini respondeu ao ping.' : 'Gemini respondeu, mas não confirmou ping.',
      model: modelUsed,
      status: ok ? 'ok' : 'degraded',
    };
  } catch (err) {
    const errorMessage = (err as Error)?.message || 'Erro desconhecido ao consultar o Gemini.';
    console.error('[Gemini health] erro:', errorMessage);
    const fallbackModel = getModelCandidates('summary')[0] || getDefaultModel('summary');
    return {
      ok: false,
      hasKey,
      message: errorMessage,
      model: fallbackModel,
      status: 'degraded',
    };
  }
}

// Testes rápidos:
// - GET  http://localhost:4000/health/gemini
// - POST http://localhost:4000/api/chat body {"message":"Explique reajuste anual de aluguel residencial","mode":"mentor"}
