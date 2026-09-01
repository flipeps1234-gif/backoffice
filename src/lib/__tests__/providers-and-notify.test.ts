import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

import { activeProviderName, extract, getExtractor } from "../extract";
import { IMAGE_TYPES, isSupportedImage } from "../extract/image-types";
import { mockExtractor } from "../extract/mock";
import * as invoice from "../invoice";
import { OWED_ALERT_CAP_DAYS, canSendOwedAlert } from "../notify/cap";
import { renderSms } from "../notify/sms-templates";
import { serviceClient } from "../notify/store";
import { MAX_CENTS } from "../transaction";

/**
 * The provider seam, the notification frequency cap, and the parked
 * invoice prototype.
 *
 * Nothing here reaches a network: the mock extractor is deliberately
 * deterministic so the whole ingest flow is exercisable with no API key,
 * and serviceClient returns null unless a service-role key is present.
 * Environment reads are stubbed per test and restored afterwards.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("choosing an extraction provider", () => {
  it("uses whatever EXTRACT_PROVIDER names, above everything else", () => {
    vi.stubEnv("EXTRACT_PROVIDER", "mock");
    vi.stubEnv("OPENAI_API_KEY", "sk-whatever");
    expect(activeProviderName()).toBe("mock");
  });

  it("uses the real one only when there is a key for it", () => {
    vi.stubEnv("EXTRACT_PROVIDER", undefined);
    vi.stubEnv("OPENAI_API_KEY", "sk-whatever");
    expect(activeProviderName()).toBe("openai");
  });

  it("falls back to the mock when there is no key, so the app still runs", () => {
    vi.stubEnv("EXTRACT_PROVIDER", undefined);
    vi.stubEnv("OPENAI_API_KEY", undefined);
    expect(activeProviderName()).toBe("mock");
  });

  it("names the providers it knows when asked for one it does not", () => {
    expect(() => getExtractor("telepathy")).toThrow(/Unknown extraction provider/);
    expect(() => getExtractor("telepathy")).toThrow(/mock/);
    expect(getExtractor("mock")).toBe(mockExtractor);
  });
});

describe("the offline mock provider", () => {
  const image = (filename: string) => ({
    kind: "image" as const,
    mediaType: "image/png",
    base64: "",
    filename,
  });

  it("returns the same rows for the same filename, every time", async () => {
    const once = await mockExtractor.extract([image("venmo-july.png")]);
    const twice = await mockExtractor.extract([image("venmo-july.png")]);
    expect(twice).toEqual(once);
    expect(once.transactions.length).toBeGreaterThan(0);
  });

  it("only ever invents rows that pass validation", async () => {
    const result = await mockExtractor.extract([image("a.png"), image("b.png")]);
    for (const tx of result.transactions) {
      expect(Number.isInteger(tx.amountCents)).toBe(true);
      expect(tx.amountCents).toBeGreaterThanOrEqual(0);
      expect(tx.amountCents).toBeLessThanOrEqual(MAX_CENTS);
      expect(tx.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(tx.source).toBe("screenshot");
      expect(tx.business).toBeNull();
    }
  });

  it("produces expenses for a receipt, so the money-out path works offline", async () => {
    const result = await mockExtractor.extract([image("receipt-shell.png")]);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].direction).toBe("out");
  });

  it("produces the no-amounts warning for a social screenshot instead of inventing money", async () => {
    const result = await mockExtractor.extract([image("social-feed.png")]);
    expect(result.transactions).toEqual([]);
    expect(result.warnings).toEqual([
      { code: "no_amounts_visible", filename: "social-feed.png" },
    ]);
  });

  it("flags roughly a quarter of the rows as shaky, so the sheet has something to fix", async () => {
    const result = await mockExtractor.extract(
      Array.from({ length: 8 }, (_, i) => image(`feed-${i}.png`)),
    );
    const shaky = result.transactions.filter((tx) => (tx.confidence.payer ?? 1) < 0.8);
    expect(shaky.length).toBeGreaterThan(0);
    expect(shaky.length).toBeLessThan(result.transactions.length);
  });

  it("extracts nothing from nothing", async () => {
    expect(await mockExtractor.extract([])).toEqual({ transactions: [], warnings: [] });
  });
});

describe("the entry point dedupes so no caller can forget to", () => {
  it("collapses the duplicate rows two overlapping screenshots produce", async () => {
    const input = {
      kind: "image" as const,
      mediaType: "image/png",
      base64: "",
      filename: "venmo-july.png",
    };
    const raw = await mockExtractor.extract([input, input]);
    const deduped = await extract([input, input], "mock");
    expect(deduped.transactions.length).toBeLessThan(raw.transactions.length);
  });

  it("keeps the warnings alongside the rows", async () => {
    const result = await extract(
      [{ kind: "image", mediaType: "image/png", base64: "", filename: "social.png" }],
      "mock",
    );
    expect(result.warnings).toHaveLength(1);
  });
});

describe("which images the vision endpoint accepts", () => {
  it("accepts exactly the four types both sides agreed on", () => {
    expect([...IMAGE_TYPES].sort()).toEqual([
      "image/gif",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("refuses anything else, so one HEIC cannot abort the rest of the batch", () => {
    expect(isSupportedImage({ type: "image/png" } as File)).toBe(true);
    expect(isSupportedImage({ type: "image/heic" } as File)).toBe(false);
    expect(isSupportedImage({ type: "application/pdf" } as File)).toBe(false);
    expect(isSupportedImage({ type: "" } as File)).toBe(false);
  });
});

describe("the owed-alert frequency cap is a hard rule, not a knob", () => {
  it("allows the first alert a client has ever had", () => {
    expect(canSendOwedAlert(null, "2026-08-14T12:00:00Z")).toBe(true);
  });

  it("allows another one exactly a week later, and not a minute before", () => {
    expect(OWED_ALERT_CAP_DAYS).toBe(7);
    const sent = "2026-08-07T12:00:00Z";
    expect(canSendOwedAlert(sent, "2026-08-14T12:00:00Z")).toBe(true);
    expect(canSendOwedAlert(sent, "2026-08-14T11:59:00Z")).toBe(false);
    expect(canSendOwedAlert(sent, "2026-08-08T12:00:00Z")).toBe(false);
  });

  it("never allows two alerts inside the same week, for any pair of times", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 * 86_400 }), (secondsLater) => {
        const sent = "2026-08-01T00:00:00Z";
        const now = new Date(Date.parse(sent) + secondsLater * 1000).toISOString();
        expect(canSendOwedAlert(sent, now)).toBe(false);
      }),
      { numRuns: 500 },
    );
  });
});

describe("the SMS drafts carry the minimum and always say how to stop", () => {
  it("fills the positional placeholders in order", () => {
    expect(renderSms("owed_aging", "en", ["contado", "$120.50", "Rosa", "Jul 4"])).toBe(
      "contado: $120.50 is still open for Rosa's job of Jul 4. Reply STOP to opt out.",
    );
  });

  it("has a variant in every language for every event, each ending with the opt-out", () => {
    for (const event of ["owed_aging", "payment_matched", "monthly_recap"] as const) {
      for (const lang of ["en", "es", "pt"] as const) {
        const text = renderSms(event, lang, ["1", "2", "3", "4"]);
        expect(text).not.toContain("{");
        expect(text.toUpperCase()).toContain("STOP");
      }
    }
  });

  it("leaves a placeholder alone when no value was supplied, rather than printing undefined", () => {
    const text = renderSms("monthly_recap", "en", ["July"]);
    expect(text).toContain("July");
    expect(text).not.toContain("undefined");
  });
});

describe("webhook database access", () => {
  it("declines to write when no service-role key is configured, rather than pretending", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    expect(serviceClient()).toBeNull();
  });

  it("declines when the URL is missing too", () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    expect(serviceClient()).toBeNull();
  });
});

/**
 * invoice.ts is marked in its own first line as a parked prototype —
 * "future payment-links module, do not extend". It is tested here to
 * pin what it currently does, NOT to bless it: its money parser and its
 * line-total rounding both disagree with the shipped ledger's, which is
 * recorded in BUGS.md rather than fixed.
 */
describe("the parked invoice prototype", () => {
  it("starts with one empty line item and no numbers filled in", () => {
    expect(invoice.emptyInvoice.items).toHaveLength(1);
    expect(invoice.emptyItem("item-2")).toEqual({
      id: "item-2",
      description: "",
      quantity: 1,
      unitPriceCents: 0,
    });
  });

  it("reads plain en-US decimals", () => {
    expect(invoice.dollarsToCents("12.34")).toBe(1234);
    expect(invoice.dollarsToCents("0.5")).toBe(50);
    expect(invoice.dollarsToCents("nonsense")).toBe(0);
  });

  it("does NOT read the comma decimals the shipped ledger accepts — BUGS.md #3", () => {
    // The ledger's own parser reads "1.234,56" as $1,234.56. This one
    // reads it as $1.23. Confined to the parked prototype, which is why
    // it is recorded rather than fixed.
    expect(invoice.dollarsToCents("1.234,56")).toBe(123);
    expect(invoice.dollarsToCents("12,34")).toBe(1200);
  });

  it("rounds the QUANTITY rather than the product, unlike the ledger — BUGS.md #4", () => {
    // sale.ts rounds unitCents × quantity; this rounds quantity first, so
    // 2.5 hours at $10 bills as 3 hours.
    expect(invoice.lineTotalCents({ id: "a", description: "", quantity: 2.5, unitPriceCents: 1_000 })).toBe(3_000);
    expect(invoice.invoiceTotalCents([
      { id: "a", description: "", quantity: 2.5, unitPriceCents: 1_000 },
      { id: "b", description: "", quantity: 1, unitPriceCents: 500 },
    ])).toBe(3_500);
  });

  it("totals an empty invoice at zero", () => {
    expect(invoice.invoiceTotalCents([])).toBe(0);
  });

  it("formats and unformats money the same way the ledger displays it", () => {
    expect(invoice.centsToDollars(1234)).toBe("12.34");
    expect(invoice.formatCents(123456)).toBe("$1,234.56");
  });
});
