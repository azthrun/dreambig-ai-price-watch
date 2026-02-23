import { describe, expect, it } from "vitest";
import { buildEmailReport } from "../src/email/templates.js";
import { ProductResult } from "../src/domain/types.js";

describe("buildEmailReport", () => {
  it("renders required columns including notes", () => {
    const sample: ProductResult[] = [
      {
        productName: "iPhone 16",
        warnings: [],
        offers: [
          {
            productName: "iPhone 16",
            priceAmount: 799,
            shippingAmount: 0,
            totalAmount: 799,
            priceCurrency: "USD",
            storeName: "Best Buy",
            productUrl: "https://bestbuy.com/p",
            discountText: "$20 off",
            notes: "In stock",
            shipsToUs: true,
            sourceTrustLevel: "trusted",
            retrievedAt: new Date().toISOString()
          }
        ]
      }
    ];

    const report = buildEmailReport(sample);

    expect(report.html).toContain("Product Price");
    expect(report.html).toContain("Shipping Price");
    expect(report.html).toContain("Total Price");
    expect(report.html).toContain("Notes");
    expect(report.text).toContain("Notes: In stock");
  });
});
