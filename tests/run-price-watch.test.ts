import { describe, expect, it, vi } from "vitest";
import { runPriceWatch } from "../src/app/run-price-watch.js";
import { AppConfig } from "../src/config/env.js";
import { OfferRow } from "../src/domain/types.js";

const config: AppConfig = {
  geminiApiKey: "k",
  cronSchedule: "0 * * * *",
  watchedProducts: ["p1", "p2"],
  recipientEmails: ["r@example.com"],
  smtp: {
    host: "smtp.example.com",
    port: 587,
    user: "u",
    pass: "p",
    from: "from@example.com"
  },
  timezone: "UTC",
  maxResultsPerProduct: 5,
  trustedSellers: ["best buy", "target"],
  concurrency: 2,
  runOnStartup: true,
  requestTimeoutMs: 5000,
  requestRetries: 0,
  modelName: "gemini-2.5-flash"
};

function makeOffer(productName: string): OfferRow {
  return {
    productName,
    priceAmount: 10,
    shippingAmount: 2,
    totalAmount: 12,
    priceCurrency: "USD",
    storeName: "Best Buy",
    productUrl: "https://bestbuy.com/p",
    discountText: "",
    notes: "",
    shipsToUs: true,
    sourceTrustLevel: "trusted",
    retrievedAt: new Date().toISOString()
  };
}

describe("runPriceWatch", () => {
  it("processes products and sends one email", async () => {
    const send = vi.fn(async () => {});
    const fetchOffers = vi.fn(async (product: string) => [makeOffer(product)]);

    await runPriceWatch({
      config,
      offerProvider: { fetchOffers },
      emailSender: { send },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    });

    expect(fetchOffers).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
