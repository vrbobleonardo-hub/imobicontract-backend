declare module 'mercadopago' {
  export class MercadoPagoConfig {
    constructor(options: { accessToken: string; options?: Record<string, unknown> });
  }

  export class Preference {
    constructor(config: MercadoPagoConfig);
    create(params: { body: any }): Promise<any>;
  }

  export class Payment {
    constructor(config: MercadoPagoConfig);
    get(params: { id: string }): Promise<any>;
  }
}
