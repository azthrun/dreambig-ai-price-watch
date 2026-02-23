import { describe, expect, it } from "vitest";
import { normalizeAndFilterOffers } from "../src/domain/offer-utils.js";
import { OfferRow } from "../src/domain/types.js";

function offer(overrides: Partial<OfferRow>): OfferRow {
  return {
    productName: "iPhone 16",
    priceAmount: 799,
    shippingAmount: 10,
    totalAmount: 809,
    priceCurrency: "USD",
    storeName: "Best Buy",
    productUrl: "https://www.bestbuy.com/item/123",
    discountText: "",
    notes: "",
    shipsToUs: true,
    sourceTrustLevel: "trusted",
    retrievedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("normalizeAndFilterOffers", () => {
  it("sorts by total amount and limits by max results", () => {
    const result = normalizeAndFilterOffers(
      [
        offer({ storeName: "Target", productUrl: "https://target.com/a", priceAmount: 500, shippingAmount: 20 }),
        offer({ storeName: "Walmart", productUrl: "https://walmart.com/a", priceAmount: 510, shippingAmount: 0 }),
        offer({ storeName: "Best Buy", productUrl: "https://bestbuy.com/a", priceAmount: 490, shippingAmount: 40 })
      ],
      ["best buy", "target", "walmart"],
      3
    );

    expect(result.offers.map((x) => x.storeName)).toEqual(["Walmart", "Target", "Best Buy"]);
  });

  it("excludes non-costco membership offers", () => {
    const result = normalizeAndFilterOffers(
      [
        offer({
          storeName: "Walmart",
          productUrl: "https://walmart.com/p",
          notes: "Prime membership required"
        }),
        offer({
          storeName: "Costco",
          productUrl: "https://costco.com/p",
          notes: "Member price"
        })
      ],
      ["walmart", "costco"],
      5
    );

    expect(result.offers).toHaveLength(1);
    expect(result.offers[0]?.storeName).toBe("Costco");
  });

  it("excludes non-US and untrusted offers", () => {
    const result = normalizeAndFilterOffers(
      [
        offer({ storeName: "Unknown", productUrl: "https://unknown.example/p" }),
        offer({ storeName: "Target", productUrl: "https://target.com/p", shipsToUs: false }),
        offer({ storeName: "Target", productUrl: "https://target.com/p2" })
      ],
      ["target"],
      5
    );

    expect(result.offers).toHaveLength(1);
    expect(result.offers[0]?.storeName).toBe("Target");
  });
});
