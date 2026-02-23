import pLimit from "p-limit";
import { AppConfig } from "../config/env.js";
import { normalizeAndFilterOffers } from "../domain/offer-utils.js";
import { ProductResult } from "../domain/types.js";
import { buildEmailReport } from "../email/templates.js";
import { EmailSender } from "../email/mailer.js";
import { OfferProvider } from "../providers/gemini/gemini-provider.js";

interface LoggerLike {
  info(payload: unknown, message?: string): void;
  warn(payload: unknown, message?: string): void;
  error(payload: unknown, message?: string): void;
}

interface RunDependencies {
  config: AppConfig;
  offerProvider: OfferProvider;
  emailSender: EmailSender;
  logger: LoggerLike;
}

async function processProduct(
  productName: string,
  deps: RunDependencies
): Promise<ProductResult> {
  try {
    const rawOffers = await deps.offerProvider.fetchOffers(productName);
    const { offers, warnings } = normalizeAndFilterOffers(
      rawOffers,
      deps.config.trustedSellers,
      deps.config.maxResultsPerProduct
    );

    return {
      productName,
      offers,
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    deps.logger.error({ productName, error: message }, "Product processing failed");

    return {
      productName,
      offers: [],
      warnings: [],
      error: message
    };
  }
}

export async function runPriceWatch(deps: RunDependencies): Promise<void> {
  const startedAt = Date.now();
  deps.logger.info(
    {
      products: deps.config.watchedProducts.length,
      recipients: deps.config.recipientEmails.length
    },
    "Starting scheduled price watch run"
  );

  const limit = pLimit(deps.config.concurrency);

  const results = await Promise.all(
    deps.config.watchedProducts.map((productName) =>
      limit(() => processProduct(productName, deps))
    )
  );

  const report = buildEmailReport(results);
  await deps.emailSender.send({
    to: deps.config.recipientEmails,
    subject: report.subject,
    html: report.html,
    text: report.text
  });

  const durationMs = Date.now() - startedAt;
  deps.logger.info(
    {
      durationMs,
      productsProcessed: results.length,
      failures: results.filter((r) => r.error).length
    },
    "Price watch run completed"
  );
}
