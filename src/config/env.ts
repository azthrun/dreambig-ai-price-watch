import { z } from "zod";

const DEFAULT_TRUSTED_SELLERS = [
  "best buy",
  "target",
  "costco",
  "walmart"
];

const schema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  CRON_SCHEDULE: z.string().min(1),
  WATCHED_PRODUCTS: z.string().min(1),
  RECIPIENT_EMAILS: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  PRODUCT_DELIMITER: z.string().default("|"),
  EMAIL_DELIMITER: z.string().default(","),
  TRUSTED_SELLERS: z.string().optional(),
  TIMEZONE: z.string().default("UTC"),
  MAX_RESULTS_PER_PRODUCT: z.coerce.number().int().min(3).max(5).default(5),
  CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  RUN_ON_STARTUP: z
    .enum(["true", "false"]) 
    .default("false")
    .transform((value) => value === "true"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  REQUEST_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  MODEL_NAME: z.string().default("gemini-2.5-flash")
});

export interface AppConfig {
  geminiApiKey: string;
  cronSchedule: string;
  watchedProducts: string[];
  recipientEmails: string[];
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  timezone: string;
  maxResultsPerProduct: number;
  trustedSellers: string[];
  concurrency: number;
  runOnStartup: boolean;
  requestTimeoutMs: number;
  requestRetries: number;
  modelName: string;
}

function splitDelimited(input: string, delimiter: string): string[] {
  return input
    .split(delimiter)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseEnv(rawEnv: NodeJS.ProcessEnv): AppConfig {
  const result = schema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "unknown";
      return `${key}: ${issue.message}`;
    });
    throw new Error(
      `Invalid environment configuration. Fix these variables: ${issues.join("; ")}`
    );
  }
  const parsed = result.data;

  const watchedProducts = splitDelimited(
    parsed.WATCHED_PRODUCTS,
    parsed.PRODUCT_DELIMITER
  );
  const recipientEmails = splitDelimited(
    parsed.RECIPIENT_EMAILS,
    parsed.EMAIL_DELIMITER
  );

  if (watchedProducts.length === 0) {
    throw new Error("WATCHED_PRODUCTS must include at least one product");
  }
  if (recipientEmails.length === 0) {
    throw new Error("RECIPIENT_EMAILS must include at least one email");
  }

  const trustedSellers = parsed.TRUSTED_SELLERS
    ? splitDelimited(parsed.TRUSTED_SELLERS, parsed.PRODUCT_DELIMITER)
    : DEFAULT_TRUSTED_SELLERS;

  return {
    geminiApiKey: parsed.GEMINI_API_KEY,
    cronSchedule: parsed.CRON_SCHEDULE,
    watchedProducts,
    recipientEmails,
    smtp: {
      host: parsed.SMTP_HOST,
      port: parsed.SMTP_PORT,
      user: parsed.SMTP_USER,
      pass: parsed.SMTP_PASS,
      from: parsed.SMTP_FROM
    },
    timezone: parsed.TIMEZONE,
    maxResultsPerProduct: parsed.MAX_RESULTS_PER_PRODUCT,
    trustedSellers: trustedSellers.map((seller) => seller.toLowerCase()),
    concurrency: parsed.CONCURRENCY,
    runOnStartup: parsed.RUN_ON_STARTUP,
    requestTimeoutMs: parsed.REQUEST_TIMEOUT_MS,
    requestRetries: parsed.REQUEST_RETRIES,
    modelName: parsed.MODEL_NAME
  };
}
