import { NotificationType } from '../types';

export type RecommendedChannel = 'CARTA_REGISTRADA' | 'EMAIL' | 'WHATSAPP' | 'CARTORIO';

export type NotificationTemplate = {
  type: NotificationType;
  label: string;
  shortDescription: string;
  defaultTitle: string;
  defaultBody: string;
  recommendedChannel: RecommendedChannel;
  tags: string[];
};

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'COBRANCA_ALUGUEL_EM_ATRASO',
    label: 'Cobrança de aluguel em atraso',
    shortDescription: 'Lembrete formal sobre parcela vencida com prazo curto para regularização.',
    defaultTitle: 'Cobrança de aluguel em atraso',
    defaultBody: `Prezado(a) {nome_locatario},

Conforme contrato de locação do imóvel situado em {endereco_imovel}, identificamos o atraso no pagamento do aluguel com vencimento em {vencimento}.

Solicitamos a regularização em até {prazo_dias} dias, sob pena de incidência de multa e demais encargos previstos em contrato.

Caso já tenha realizado o pagamento, desconsidere este aviso e, por gentileza, encaminhe o comprovante.`,
    recommendedChannel: 'WHATSAPP',
    tags: ['cobranca', 'aluguel', 'inadimplencia'],
  },
  {
    type: 'COBRANCA_MULTIPLAS_PARCELAS',
    label: 'Cobrança de múltiplas parcelas',
    shortDescription: 'Cobrança consolidada de mais de uma parcela em aberto.',
    defaultTitle: 'Regularização de parcelas em aberto',
    defaultBody: `Prezado(a) {nome_locatario},

Constatamos a existência de {quantidade_parcelas} parcelas em aberto referentes ao contrato do imóvel em {endereco_imovel}.

Para evitar protesto e rescisão contratual, solicitamos o pagamento ou a formalização de um acordo em até {prazo_dias} dias.

Estamos disponíveis para esclarecer dúvidas ou alinhar um plano de regularização.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['cobranca', 'parcelas', 'inadimplencia'],
  },
  {
    type: 'REAJUSTE_ANUAL_ALUGUEL',
    label: 'Reajuste anual do aluguel',
    shortDescription: 'Comunicação de reajuste anual conforme índice contratual.',
    defaultTitle: 'Aviso de reajuste anual do aluguel',
    defaultBody: `Prezado(a) {nome_locatario},

De acordo com a cláusula de reajuste do contrato do imóvel em {endereco_imovel}, informamos que o valor do aluguel será atualizado a partir de {data_reajuste}, utilizando o índice {indice} acumulado dos últimos 12 meses.

O novo valor mensal passará a ser de R$ {valor_reajustado}. O boleto/recibo já refletirá o reajuste na próxima competência.`,
    recommendedChannel: 'EMAIL',
    tags: ['reajuste', 'contrato', 'indice'],
  },
  {
    type: 'AVISO_REAJUSTE_ACIMA_IGPM',
    label: 'Aviso de reajuste acima do IGPM/IPCA',
    shortDescription: 'Notificação quando o índice projetado supera o usual, contextualizando impacto.',
    defaultTitle: 'Comunicação de reajuste excepcional',
    defaultBody: `Prezado(a) {nome_locatario},

Informamos que, em razão da variação do índice {indice} acima do esperado, o reajuste do aluguel do imóvel em {endereco_imovel} será aplicado a partir de {data_reajuste}.

O novo valor proposto é de R$ {valor_reajustado}. Mantemos abertura para dialogar sobre eventuais ajustes ou cronograma de transição.

Caso deseje uma revisão conjunta, responda a este aviso para agendarmos.`,
    recommendedChannel: 'EMAIL',
    tags: ['reajuste', 'indice', 'negociacao'],
  },
  {
    type: 'AVISO_ENTRADA_VISTORIA',
    label: 'Aviso de vistoria de entrada',
    shortDescription: 'Confirma agendamento de vistoria inicial com orientações ao inquilino.',
    defaultTitle: 'Confirmação de vistoria de entrada',
    defaultBody: `Prezado(a) {nome_locatario},

Confirmamos a vistoria de entrada do imóvel em {endereco_imovel} para {data} às {hora}. A vistoria avaliará o estado do imóvel e registrará o checklist inicial.

Pedimos que deixe o acesso livre e, se necessário, um representante autorizado esteja presente.`,
    recommendedChannel: 'WHATSAPP',
    tags: ['vistoria', 'entrada', 'checklist'],
  },
  {
    type: 'AVISO_SAIDA_VISTORIA',
    label: 'Aviso de vistoria de saída',
    shortDescription: 'Agenda vistoria final e reforça responsabilidades na devolução.',
    defaultTitle: 'Agendamento de vistoria de saída',
    defaultBody: `Prezado(a) {nome_locatario},

Agendamos a vistoria de saída do imóvel em {endereco_imovel} para {data} às {hora}. Nesta visita avaliaremos eventuais reparos, pintura e limpeza final conforme contrato.

Solicitamos que o imóvel esteja desocupado e limpo, com todas as chaves disponíveis para conferência.`,
    recommendedChannel: 'WHATSAPP',
    tags: ['vistoria', 'saida', 'devolucao'],
  },
  {
    type: 'NOTIFICACAO_DESCUMPRIMENTO_CLAUSULA',
    label: 'Descumprimento de cláusula contratual',
    shortDescription: 'Alerta formal sobre violação de cláusula e prazo para sanar.',
    defaultTitle: 'Notificação de descumprimento contratual',
    defaultBody: `Prezado(a) {nome_destinatario},

Identificamos o descumprimento da cláusula {clausula} do contrato referente ao imóvel em {endereco_imovel}.

Solicitamos a regularização em até {prazo_dias} dias, sob pena das medidas previstas em contrato e na Lei do Inquilinato, incluindo possível rescisão e cobrança de multas.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['contrato', 'descumprimento', 'prazo'],
  },
  {
    type: 'NOTIFICACAO_OBRAS_NAO_AUTORIZADAS',
    label: 'Obras não autorizadas',
    shortDescription: 'Exige paralisação/regularização de obras feitas sem autorização.',
    defaultTitle: 'Notificação de obras não autorizadas',
    defaultBody: `Prezado(a) {nome_locatario},

Constatamos intervenções/obras no imóvel em {endereco_imovel} sem a devida autorização prévia do locador, contrariando o contrato e o art. 23, V da Lei do Inquilinato.

Solicitamos a imediata paralisação e apresentação do escopo para análise. Caso já executadas, regularize e devolva o imóvel ao estado original em até {prazo_dias} dias.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['obra', 'autorizacao', 'regularizacao'],
  },
  {
    type: 'NOTIFICACAO_BARULHO_VIZINHANCA',
    label: 'Perturbação por barulho',
    shortDescription: 'Advertência sobre ruídos e convivência condominial.',
    defaultTitle: 'Advertência por barulho e convivência',
    defaultBody: `Prezado(a) {nome_locatario},

Recebemos reclamações recorrentes de ruídos no imóvel em {endereco_imovel}, em desacordo com o regulamento condominial e o dever de vizinhança.

Solicitamos ajuste imediato das condutas, mantendo silêncio nos horários de descanso e respeito às normas do condomínio. Novos episódios poderão gerar multa condominial e rescisão.`,
    recommendedChannel: 'EMAIL',
    tags: ['condominio', 'convivencia', 'barulho'],
  },
  {
    type: 'NOTIFICACAO_ANIMAIS_CONDOMINIO',
    label: 'Animais em desacordo com regras',
    shortDescription: 'Alerta sobre animais sem autorização ou fora das regras.',
    defaultTitle: 'Notificação sobre animais no condomínio',
    defaultBody: `Prezado(a) {nome_locatario},

Foi registrada a presença de animal em desacordo com o regulamento do condomínio no imóvel em {endereco_imovel}.

Solicitamos a regularização (cadastro, vacinação, regras de circulação) ou retirada do animal em até {prazo_dias} dias para evitar multa e demais penalidades.`,
    recommendedChannel: 'EMAIL',
    tags: ['animais', 'condominio', 'regras'],
  },
  {
    type: 'AVISO_RESILICAO_ANTECIPADA',
    label: 'Aviso de resilição antecipada',
    shortDescription: 'Comunica intenção de encerrar o contrato antes do prazo.',
    defaultTitle: 'Aviso de resilição antecipada',
    defaultBody: `Prezado(a) {nome_destinatario},

Comunicamos a intenção de rescindir antecipadamente o contrato do imóvel em {endereco_imovel}, a partir de {data_rescisao}.

Solicitamos providências para cálculo de multa (se aplicável), vistoria final e devolução das chaves. Podemos alinhar datas e responsabilidades para uma transição organizada.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['rescisao', 'prazo', 'transicao'],
  },
  {
    type: 'AVISO_FIM_CONTRATO',
    label: 'Aviso de fim de contrato',
    shortDescription: 'Recordatório do término do contrato e próximos passos.',
    defaultTitle: 'Aviso de término de contrato',
    defaultBody: `Prezado(a) {nome_destinatario},

O contrato do imóvel em {endereco_imovel} encerra-se em {data_fim}. Solicitamos manifestar interesse em renovação ou desocupação em até {prazo_manifestacao} dias.

Caso opte pela saída, alinharemos vistoria e devolução das chaves. Permanecemos à disposição.`,
    recommendedChannel: 'EMAIL',
    tags: ['fim de contrato', 'renovacao', 'planejamento'],
  },
  {
    type: 'AVISO_RENOVACAO_PROPOSTA',
    label: 'Proposta de renovação',
    shortDescription: 'Sugestão de renovação com novo valor e condições.',
    defaultTitle: 'Proposta de renovação contratual',
    defaultBody: `Prezado(a) {nome_locatario},

Gostaríamos de propor a renovação do contrato do imóvel em {endereco_imovel} por mais {prazo_meses} meses.

Proposta de novo valor: R$ {valor_proposto}, a vigorar a partir de {data_inicio}. Caso concorde, seguiremos com minuta para assinatura.`,
    recommendedChannel: 'EMAIL',
    tags: ['renovacao', 'proposta', 'valor'],
  },
  {
    type: 'COBRANCA_CONDOMINIO_ATRASO',
    label: 'Condomínio em atraso',
    shortDescription: 'Cobra rateio condominial pendente conforme contrato.',
    defaultTitle: 'Cobrança de condomínio em atraso',
    defaultBody: `Prezado(a) {nome_locatario},

Verificamos atraso no repasse das cotas condominiais referentes ao imóvel em {endereco_imovel}, competência {competencia}.

Solicitamos pagamento imediato para evitar multa condominial e eventuais restrições de uso das áreas comuns.`,
    recommendedChannel: 'EMAIL',
    tags: ['condominio', 'cobranca', 'repasse'],
  },
  {
    type: 'COBRANCA_IPTU_ATRASO',
    label: 'IPTU em atraso',
    shortDescription: 'Cobra tributo municipal pendente conforme contrato.',
    defaultTitle: 'Cobrança de IPTU em atraso',
    defaultBody: `Prezado(a) {nome_locatario},

Conforme contrato, o IPTU do imóvel em {endereco_imovel}, referente ao exercício {ano}, encontra-se em aberto.

Solicitamos quitação em até {prazo_dias} dias para evitar atualização monetária, juros e inscrição em dívida ativa.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['iptu', 'tributo', 'cobranca'],
  },
  {
    type: 'ADVERTENCIA_FORMAL',
    label: 'Advertência formal',
    shortDescription: 'Comunica infração e alerta sobre reincidência.',
    defaultTitle: 'Advertência formal',
    defaultBody: `Prezado(a) {nome_destinatario},

Registramos a infração {descricao_infracao} no contexto do contrato do imóvel em {endereco_imovel}.

Esta é uma advertência formal. Reincidências poderão resultar em multa, restrições ou rescisão contratual, conforme cláusulas pactuadas.`,
    recommendedChannel: 'CARTA_REGISTRADA',
    tags: ['advertencia', 'contrato', 'reincidencia'],
  },
  {
    type: 'ULTIMO_AVISO_EXTRAJUDICIAL',
    label: 'Último aviso extrajudicial',
    shortDescription: 'Comunica etapa final antes de medidas judiciais/protesto.',
    defaultTitle: 'Último aviso extrajudicial',
    defaultBody: `Prezado(a) {nome_destinatario},

Apesar dos avisos anteriores, permanecem pendentes as obrigações relacionadas ao imóvel em {endereco_imovel}.

Este é o último aviso extrajudicial antes do encaminhamento para protesto ou medidas judiciais cabíveis. Regularize em até {prazo_dias} dias ou apresente proposta formal.`,
    recommendedChannel: 'CARTORIO',
    tags: ['cobranca', 'extrajudicial', 'prazo final'],
  },
];
