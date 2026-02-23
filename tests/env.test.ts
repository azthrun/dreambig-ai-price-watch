import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env.js";

function baseEnv(): NodeJS.ProcessEnv {
  return {
    GEMINI_API_KEY: "test-key",
    CRON_SCHEDULE: "0 */6 * * *",
    WATCHED_PRODUCTS: "iphone 16|macbook air m3",
    RECIPIENT_EMAILS: "a@example.com,b@example.com",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_USER: "user",
    SMTP_PASS: "pass",
    SMTP_FROM: "alerts@example.com"
  };
}

describe("parseEnv", () => {
  it("parses default delimiters and values", () => {
    const config = parseEnv(baseEnv());

    expect(config.watchedProducts).toEqual(["iphone 16", "macbook air m3"]);
    expect(config.recipientEmails).toEqual(["a@example.com", "b@example.com"]);
    expect(config.maxResultsPerProduct).toBe(5);
    expect(config.runOnStartup).toBe(false);
  });

  it("supports custom product delimiter", () => {
    const config = parseEnv({
      ...baseEnv(),
      PRODUCT_DELIMITER: ";",
      WATCHED_PRODUCTS: "a;b"
    });

    expect(config.watchedProducts).toEqual(["a", "b"]);
  });
});
