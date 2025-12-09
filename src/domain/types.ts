export type MaritalStatus = 'SOLTEIRO' | 'CASADO' | 'UNIAO_ESTAVEL' | 'DIVORCIADO' | 'VIUVO';
export type MaritalRegime = 'COMUNHAO_PARCIAL' | 'COMUNHAO_TOTAL' | 'SEPARACAO_TOTAL' | 'OUTRO';

export type PersonSummary = {
  id: string;
  fullName: string;
  cpf: string;
  email?: string | null;
  phone?: string | null;
};

export type Contract = {
  id: string;
  titulo: string;
  endereco: string;
  tipo: string;
  status: string;
  criadoEm: string;
  startDate?: string;
  endDate?: string;
  rentValue?: number;
  condoValue?: number;
  iptuValue?: number;
  depositValue?: number;
  dueDay?: number;
  city?: string;
  state?: string;
  fullAddress?: string;
  propertyDescription?: string | null;
  generatedText?: string | null;
  landlords?: PersonSummary[];
  tenants?: PersonSummary[];
};

export type PropertySummary = {
  id: number;
  title: string;
  address?: string;
  city?: string | null;
  state?: string | null;
};

export type NotificationStatus = 'PENDENTE' | 'ENVIADA' | 'ARQUIVADA';
export type NotificationType =
  | 'COBRANCA_ALUGUEL_EM_ATRASO'
  | 'COBRANCA_MULTIPLAS_PARCELAS'
  | 'REAJUSTE_ANUAL_ALUGUEL'
  | 'AVISO_REAJUSTE_ACIMA_IGPM'
  | 'AVISO_ENTRADA_VISTORIA'
  | 'AVISO_SAIDA_VISTORIA'
  | 'NOTIFICACAO_DESCUMPRIMENTO_CLAUSULA'
  | 'NOTIFICACAO_OBRAS_NAO_AUTORIZADAS'
  | 'NOTIFICACAO_BARULHO_VIZINHANCA'
  | 'NOTIFICACAO_ANIMAIS_CONDOMINIO'
  | 'AVISO_RESILICAO_ANTECIPADA'
  | 'AVISO_FIM_CONTRATO'
  | 'AVISO_RENOVACAO_PROPOSTA'
  | 'COBRANCA_CONDOMINIO_ATRASO'
  | 'COBRANCA_IPTU_ATRASO'
  | 'ADVERTENCIA_FORMAL'
  | 'ULTIMO_AVISO_EXTRAJUDICIAL';

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: NotificationType;
  status: NotificationStatus;
  propertyId?: number | null;
  landlordId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
  property?: PropertySummary | null;
  landlord?: PersonSummary | null;
  tenant?: PersonSummary | null;
};

export type Inspection = {
  id: number;
  endereco: string;
  tipo: string;
  status: string;
  data: string;
  createdFromAi?: boolean;
  aiSummary?: string | null;
  aiJson?: any;
  contractId?: string | null;
  tenantRecordId?: string | null;
};

export type Subscription = {
  id: number;
  email: string;
  planId: string;
  status: string;
  priceCents: number;
  currency: string;
  mpPrefId?: string | null;
  mpPaymentId?: string | null;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractFilters = {
  status?: string;
  tipo?: string;
  q?: string;
};

export type NotificationFilters = {
  status?: NotificationStatus | 'todos';
  type?: NotificationType | 'todos';
  propertyId?: number;
  q?: string;
};

export type InspectionFilters = {
  status?: string;
  tipo?: string;
  q?: string;
};
