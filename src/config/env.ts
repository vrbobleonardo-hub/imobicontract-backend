import 'dotenv/config';

const required = ['API_BASE_URL', 'FRONTEND_BASE_URL'] as const;

type RequiredKeys = (typeof required)[number];

const values: Record<string, string | undefined> = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  MERCADO_PAGO_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN,
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
};

function assertEnv() {
  required.forEach((key) => {
    if (!values[key]) {
      throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
    }
  });
}

assertEnv();

export const env = {
  googleApiKey: values.GOOGLE_API_KEY,
  databaseUrl: values.DATABASE_URL,
  mpAccessToken: values.MERCADO_PAGO_ACCESS_TOKEN,
  frontendBaseUrl: values.FRONTEND_BASE_URL!,
  apiBaseUrl: values.API_BASE_URL!,
};
