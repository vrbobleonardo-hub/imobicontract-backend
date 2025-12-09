export type Contract = {
  id: string;
  titulo: string;
  endereco: string;
  tipo: string;
  status: string;
  criadoEm: string;
};

export type Notification = {
  id: number;
  title: string;
  body: string;
  type: string;
  status: string;
  propertyId?: number | null;
  landlordId?: string | null;
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Inspection = {
  id: string;
  endereco: string;
  tipo: string;
  status: string;
  data: string;
};
