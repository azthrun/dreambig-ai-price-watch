import pino from "pino";
import { parseEnv } from "./config/env.js";
import { runPriceWatch } from "./app/run-price-watch.js";
import { SmtpEmailSender } from "./email/mailer.js";
import { GeminiOfferProvider } from "./providers/gemini/gemini-provider.js";
import { startScheduler, validateSchedulerConfig } from "./scheduler/cron.js";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info"
});

async function main(): Promise<void> {
  const config = parseEnv(process.env);
  const offerProvider = new GeminiOfferProvider({
    apiKey: config.geminiApiKey,
    model: config.modelName,
    timeoutMs: config.requestTimeoutMs,
    retries: config.requestRetries
  });
  const emailSender = new SmtpEmailSender(config.smtp);

  const job = async () => {
    await runPriceWatch({
      config,
      offerProvider,
      emailSender,
      logger
    });
  };

  // Validate schedule settings before any immediate run to avoid restart loops
  // where startup emails are sent repeatedly while scheduler setup fails.
  validateSchedulerConfig(config.cronSchedule, config.timezone);

  startScheduler({
    cronSchedule: config.cronSchedule,
    timezone: config.timezone,
    job,
    logger
  });

  if (config.runOnStartup) {
    await job();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  logger.error({ error: message }, "Application startup failed");
  process.exit(1);
});
