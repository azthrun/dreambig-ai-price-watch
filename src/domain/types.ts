export type SourceTrustLevel =
  | "trusted"
  | "official_manufacturer"
  | "authorized_brand"
  | "unknown";

export interface OfferRow {
  productName: string;
  priceAmount: number;
  shippingAmount: number;
  totalAmount: number;
  priceCurrency: string;
  storeName: string;
  productUrl: string;
  discountText: string;
  notes: string;
  shipsToUs: boolean;
  sourceTrustLevel: SourceTrustLevel;
  retrievedAt: string;
}

export interface ProductResult {
  productName: string;
  offers: OfferRow[];
  warnings: string[];
  error?: string;
}
