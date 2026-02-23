import { OfferRow } from "./types.js";

const MEMBERSHIP_KEYWORDS = ["member", "membership", "club", "plus", "prime"];

function toHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hasMembershipGateText(offer: OfferRow): boolean {
  const blob = `${offer.discountText} ${offer.notes}`.toLowerCase();
  return MEMBERSHIP_KEYWORDS.some((keyword) => blob.includes(keyword));
}

function isCostcoOffer(offer: OfferRow): boolean {
  const store = offer.storeName.toLowerCase();
  const host = toHostname(offer.productUrl);
  return store.includes("costco") || host.includes("costco");
}

function isTrustedSeller(offer: OfferRow, trustedSellers: string[]): boolean {
  if (
    offer.sourceTrustLevel === "official_manufacturer" ||
    offer.sourceTrustLevel === "authorized_brand"
  ) {
    return true;
  }

  const store = offer.storeName.toLowerCase();
  const host = toHostname(offer.productUrl);
  return trustedSellers.some((trusted) => store.includes(trusted) || host.includes(trusted.replace(/\s+/g, "")));
}

function isValidOffer(offer: OfferRow): boolean {
  const hasValidUrl =
    offer.productUrl.startsWith("http://") ||
    offer.productUrl.startsWith("https://");

  return (
    Number.isFinite(offer.priceAmount) &&
    Number.isFinite(offer.shippingAmount) &&
    Number.isFinite(offer.totalAmount) &&
    offer.priceAmount >= 0 &&
    offer.shippingAmount >= 0 &&
    offer.totalAmount >= 0 &&
    hasValidUrl
  );
}

function recomputeTotal(offer: OfferRow): OfferRow {
  const totalAmount = Number((offer.priceAmount + offer.shippingAmount).toFixed(2));
  return {
    ...offer,
    totalAmount
  };
}

export function normalizeAndFilterOffers(
  offers: OfferRow[],
  trustedSellers: string[],
  maxResultsPerProduct: number
): { offers: OfferRow[]; warnings: string[] } {
  const warnings: string[] = [];

  const accepted = offers
    .map(recomputeTotal)
    .filter((offer) => {
      if (!offer.shipsToUs) {
        return false;
      }
      if (!isTrustedSeller(offer, trustedSellers)) {
        return false;
      }
      if (hasMembershipGateText(offer) && !isCostcoOffer(offer)) {
        return false;
      }
      if (!isValidOffer(offer)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.totalAmount - b.totalAmount)
    .slice(0, maxResultsPerProduct);

  if (accepted.length < 3) {
    warnings.push("Fewer than 3 qualified offers were found.");
  }

  return { offers: accepted, warnings };
}
