import { ProductResult } from "../domain/types.js";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEmailReport(results: ProductResult[]): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Price Watch Update - ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC`;

  const htmlSections = results.map((result) => {
    const header = `<h2>${escapeHtml(result.productName)}</h2>`;

    if (result.error) {
      return `${header}<p><strong>Error:</strong> ${escapeHtml(result.error)}</p>`;
    }

    const warningBlock = result.warnings.length
      ? `<p><strong>Notes:</strong> ${escapeHtml(result.warnings.join(" "))}</p>`
      : "";

    const rows = result.offers
      .map((offer) => {
        const link = `<a href="${escapeHtml(offer.productUrl)}" target="_blank" rel="noopener noreferrer">Open</a>`;
        return `<tr>
<td>${formatMoney(offer.priceAmount, offer.priceCurrency)}</td>
<td>${formatMoney(offer.shippingAmount, offer.priceCurrency)}</td>
<td><strong>${formatMoney(offer.totalAmount, offer.priceCurrency)}</strong></td>
<td>${escapeHtml(offer.storeName)}</td>
<td>${link}</td>
<td>${escapeHtml(offer.discountText || "-")}</td>
<td>${escapeHtml(offer.notes || "-")}</td>
</tr>`;
      })
      .join("\n");

    const table = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse; width:100%;">
<thead>
<tr>
<th>Product Price</th>
<th>Shipping Price</th>
<th>Total Price</th>
<th>Store</th>
<th>Link</th>
<th>Discount</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
${rows}
</tbody>
</table>`;

    return `${header}${warningBlock}${table}`;
  });

  const textSections = results.map((result) => {
    const lines: string[] = [];
    lines.push(`Product: ${result.productName}`);

    if (result.error) {
      lines.push(`Error: ${result.error}`);
      return lines.join("\n");
    }

    if (result.warnings.length > 0) {
      lines.push(`Notes: ${result.warnings.join(" ")}`);
    }

    lines.push("Top offers:");
    result.offers.forEach((offer, idx) => {
      lines.push(
        [
          `${idx + 1}. ${offer.storeName}`,
          `Product: ${formatMoney(offer.priceAmount, offer.priceCurrency)}`,
          `Shipping: ${formatMoney(offer.shippingAmount, offer.priceCurrency)}`,
          `Total: ${formatMoney(offer.totalAmount, offer.priceCurrency)}`,
          `Link: ${offer.productUrl}`,
          `Discount: ${offer.discountText || "-"}`,
          `Notes: ${offer.notes || "-"}`
        ].join(" | ")
      );
    });

    return lines.join("\n");
  });

  const html = `<html><body>
<h1>DreamBig AI Price Watch</h1>
${htmlSections.join("\n<hr/>\n")}
</body></html>`;

  const text = ["DreamBig AI Price Watch", ...textSections].join("\n\n");

  return { subject, html, text };
}
