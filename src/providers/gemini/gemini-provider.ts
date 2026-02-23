import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { OfferRow } from "../../domain/types.js";

export interface OfferProvider {
  fetchOffers(productName: string): Promise<OfferRow[]>;
}

interface GeminiProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  retries: number;
}

const rawOfferSchema = z.object({
  productName: z.string(),
  priceAmount: z.coerce.number(),
  shippingAmount: z.coerce.number(),
  priceCurrency: z.string().default("USD"),
  storeName: z.string(),
  productUrl: z.string().url(),
  discountText: z.string().default(""),
  notes: z.string().default(""),
  shipsToUs: z.boolean(),
  sourceTrustLevel: z
    .enum(["trusted", "official_manufacturer", "authorized_brand", "unknown"])
    .default("unknown")
});

const payloadSchema = z.object({
  offers: z.array(rawOfferSchema)
});

function buildPrompt(productName: string): string {
  return [
    "Find pricing offers on the public web for this product in the U.S. market only:",
    `Product: ${productName}`,
    "Constraints:",
    "- Use trusted U.S. sellers only.",
    "- Include Best Buy, Target, Costco, Walmart when possible.",
    "- Include official manufacturer and authorized brand stores if available.",
    "- Exclude international-shipping-only offers.",
    "- If an offer is membership-gated, only Costco membership pricing is acceptable.",
    "Output format:",
    "Return strict JSON with this shape only:",
    '{"offers":[{"productName":"","priceAmount":0,"shippingAmount":0,"priceCurrency":"USD","storeName":"","productUrl":"https://...","discountText":"","notes":"","shipsToUs":true,"sourceTrustLevel":"trusted|official_manufacturer|authorized_brand|unknown"}]}',
    "Rules:",
    "- shippingAmount must be numeric and >= 0.",
    "- priceAmount must be numeric and >= 0.",
    "- Include notes for shipping assumptions or membership terms.",
    "- Do not include markdown fences."
  ].join("\n");
}

function stripCodeFences(input: string): string {
  return input.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export class GeminiOfferProvider implements OfferProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(options: GeminiProviderOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
    this.retries = options.retries;
  }

  async fetchOffers(productName: string): Promise<OfferRow[]> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.retries) {
      try {
        const response = await withTimeout(
          this.client.models.generateContent({
            model: this.model,
            contents: buildPrompt(productName),
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.1
            }
          }),
          this.timeoutMs
        );

        const text = stripCodeFences(response.text ?? "");
        const json = JSON.parse(text);
        const parsed = payloadSchema.parse(json);

        const now = new Date().toISOString();
        return parsed.offers.map((offer) => ({
          ...offer,
          totalAmount: Number((offer.priceAmount + offer.shippingAmount).toFixed(2)),
          retrievedAt: now
        }));
      } catch (error) {
        lastError = error;
        if (attempt === this.retries) {
          break;
        }
        const backoffMs = 400 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      attempt += 1;
    }

    throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
  }
}
