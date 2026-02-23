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
  inputProductName: string,
  resolvedProductName: string,
  disambiguationNote: string | null,
  deps: RunDependencies
): Promise<ProductResult> {
  try {
    const rawOffers = await deps.offerProvider.fetchOffers(resolvedProductName);
    const { offers, warnings } = normalizeAndFilterOffers(
      rawOffers,
      deps.config.trustedSellers,
      deps.config.maxResultsPerProduct
    );
    if (disambiguationNote) {
      warnings.unshift(disambiguationNote);
    }

    return {
      productName: resolvedProductName,
      offers,
      warnings
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    deps.logger.error(
      { inputProductName, resolvedProductName, error: message },
      "Product processing failed"
    );

    return {
      productName: resolvedProductName,
      offers: [],
      warnings: disambiguationNote ? [disambiguationNote] : [],
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

  const tasks = (
    await Promise.all(
      deps.config.watchedProducts.map(async (inputProductName) => {
        const resolvedModels = await deps.offerProvider.resolveProductModels(inputProductName);
        if (resolvedModels.length <= 1) {
          return [
            {
              inputProductName,
              resolvedProductName: resolvedModels[0] ?? inputProductName,
              disambiguationNote: null as string | null
            }
          ];
        }

        const note = `Input product was ambiguous. Results are split into up to ${resolvedModels.length} likely models.`;
        return resolvedModels.map((resolvedProductName) => ({
          inputProductName,
          resolvedProductName,
          disambiguationNote: note
        }));
      })
    )
  ).flat();

  const results = await Promise.all(
    tasks.map((task) =>
      limit(() =>
        processProduct(
          task.inputProductName,
          task.resolvedProductName,
          task.disambiguationNote,
          deps
        )
      )
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
