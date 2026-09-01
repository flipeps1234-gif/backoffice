import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { CATEGORIES, isCategoryId, scheduleCLabel } from "../category";
import { findClientByName } from "../client";
import {
  EMPTY_NOTIFICATION_PREFS,
  activeConsentAt,
  hasActiveConsent,
  looksLikeE164,
} from "../notify/types";
import { EMPTY_PROFILE, hasProfile } from "../profile";
import { UNIT_LABELS, findByName, priceLabel } from "../service";
import { LOW_CONFIDENCE, formatCents, isUncertain, uncertainFields } from "../transaction";
import { client, service, txn } from "./arbitraries";

/**
 * The small modules: the catalog lookups, the Schedule C labels, the
 * confidence flags, and the notification consent record. Small does not
 * mean unimportant — the consent timestamps here are the proof a carrier
 * or Meta dispute would read.
 */

describe("the catalog is looked up by name, case-insensitively", () => {
  const catalog = [
    service({ id: "svc-1", name: "Lawn Mowing" }),
    service({ id: "svc-2", name: "Deep clean" }),
  ];

  it("finds a service however it was capitalized or padded", () => {
    expect(findByName(catalog, "lawn mowing")?.id).toBe("svc-1");
    expect(findByName(catalog, "  LAWN MOWING  ")?.id).toBe("svc-1");
  });

  it("finds nothing for a name nobody has, and never for an empty query", () => {
    expect(findByName(catalog, "Haircut")).toBeUndefined();
    expect(findByName(catalog, "")).toBeUndefined();
    expect(findByName(catalog, "   ")).toBeUndefined();
    expect(findByName([], "Lawn Mowing")).toBeUndefined();
  });

  it("finds a client the same way, so one person cannot become two", () => {
    const directory = [client({ id: "c1", name: "Rosa Delgado" })];
    expect(findClientByName(directory, "rosa delgado")?.id).toBe("c1");
    expect(findClientByName(directory, " ROSA DELGADO ")?.id).toBe("c1");
    expect(findClientByName(directory, "")).toBeUndefined();
    expect(findClientByName(directory, "Mike")).toBeUndefined();
  });
});

describe("the price on a chip", () => {
  it("drops the cents on a whole-dollar price and keeps them otherwise", () => {
    expect(priceLabel(service({ pricing: { type: "flat", cents: 6_500 } }))).toBe("$65");
    expect(priceLabel(service({ pricing: { type: "flat", cents: 6_550 } }))).toBe("$65.50");
  });

  it("says what a rate is charged per", () => {
    expect(priceLabel(service({ pricing: { type: "rate", cents: 18, unit: "sqft" } }))).toBe(
      "$0.18/sq ft",
    );
    expect(priceLabel(service({ pricing: { type: "rate", cents: 4_500, unit: "hour" } }))).toBe(
      "$45/hour",
    );
    expect(priceLabel(service({ pricing: { type: "rate", cents: 2_500, unit: "room" } }))).toBe(
      "$25/room",
    );
  });

  it("names every unit it can price by", () => {
    expect(UNIT_LABELS).toEqual({ sqft: "sq ft", hour: "hour", room: "room" });
  });

  it("formats money in en-US dollars everywhere, whatever the app's language", () => {
    // A deliberate decision recorded in i18n.ts: money stays in dollars.
    expect(formatCents(123_456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(5)).toBe("$0.05");
  });
});

describe("the tap-to-fix confidence flags", () => {
  it("flags a field the model was unsure about", () => {
    const unsure = txn({ confidence: { payer: 0.4, amountCents: 0.99 } });
    expect(isUncertain(unsure, "payer")).toBe(true);
    expect(isUncertain(unsure, "amountCents")).toBe(false);
  });

  it("treats a missing score as certain rather than flagging everything", () => {
    expect(isUncertain(txn({ confidence: {} }), "date")).toBe(false);
  });

  it("draws the line at the documented threshold, and includes it", () => {
    expect(LOW_CONFIDENCE).toBe(0.8);
    expect(isUncertain(txn({ confidence: { payer: 0.8 } }), "payer")).toBe(false);
    expect(isUncertain(txn({ confidence: { payer: 0.7999 } }), "payer")).toBe(true);
  });

  it("lists the uncertain fields in the order the sheet shows them", () => {
    const unsure = txn({ confidence: { date: 0.1, payer: 0.1, amountCents: 0.1 } });
    expect(uncertainFields(unsure)).toEqual(["payer", "amountCents", "date"]);
    expect(uncertainFields(txn({ confidence: {} }))).toEqual([]);
  });
});

describe("Schedule C categories are labels, never tax logic", () => {
  it("maps a known category to the line a preparer files it under", () => {
    expect(scheduleCLabel("supplies")).toBe("Supplies (line 22)");
    expect(scheduleCLabel("car")).toBe("Car and truck expenses (line 9)");
  });

  it("says nothing at all for an unknown or absent category", () => {
    expect(scheduleCLabel(null)).toBe("");
    expect(scheduleCLabel("invented")).toBe("");
    expect(scheduleCLabel("")).toBe("");
  });

  it("recognizes exactly the thirteen ids it stores, and nothing else", () => {
    expect(CATEGORIES).toHaveLength(13);
    for (const category of CATEGORIES) {
      expect(isCategoryId(category.id)).toBe(true);
      expect(scheduleCLabel(category.id)).toBe(category.scheduleC);
    }
    expect(isCategoryId("invented")).toBe(false);
    expect(isCategoryId(null)).toBe(false);
    expect(isCategoryId(7)).toBe(false);
  });

  it("gives every category a distinct id and a distinct Schedule C line", () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    expect(new Set(CATEGORIES.map((c) => c.scheduleC)).size).toBe(CATEGORIES.length);
  });
});

describe("the business profile", () => {
  it("counts as filled in when any one field has something in it", () => {
    expect(hasProfile(EMPTY_PROFILE)).toBe(false);
    expect(hasProfile({ businessName: "Rosa Cleans", ownerName: "", usState: "" })).toBe(true);
    expect(hasProfile({ businessName: "", ownerName: "Rosa", usState: "" })).toBe(true);
    expect(hasProfile({ businessName: "", ownerName: "", usState: "FL" })).toBe(true);
  });
});

describe("the notification consent record", () => {
  it("starts off, with no number and no consent", () => {
    expect(EMPTY_NOTIFICATION_PREFS).toEqual({
      channel: "off",
      phone: "",
      whatsappConsentAt: null,
      smsConsentAt: null,
      optedOutAt: null,
    });
    expect(hasActiveConsent(EMPTY_NOTIFICATION_PREFS)).toBe(false);
  });

  it("catches a typo in a phone number without pretending to know dialing plans", () => {
    expect(looksLikeE164("+13055550147")).toBe(true);
    expect(looksLikeE164("3055550147")).toBe(false);
    expect(looksLikeE164("+0305555")).toBe(false);
    expect(looksLikeE164("+1 305 555 0147")).toBe(false);
    expect(looksLikeE164("")).toBe(false);
  });

  it("reads the consent of the channel that is actually on, and only that one", () => {
    const prefs = {
      ...EMPTY_NOTIFICATION_PREFS,
      whatsappConsentAt: "2026-08-01T10:00:00Z",
      smsConsentAt: null,
    };
    expect(activeConsentAt({ ...prefs, channel: "whatsapp" })).toBe("2026-08-01T10:00:00Z");
    expect(activeConsentAt({ ...prefs, channel: "sms" })).toBeNull();
    expect(activeConsentAt({ ...prefs, channel: "off" })).toBeNull();
  });

  it("treats agreeing to WhatsApp as not agreeing to SMS", () => {
    const whatsappOnly = {
      ...EMPTY_NOTIFICATION_PREFS,
      channel: "sms" as const,
      whatsappConsentAt: "2026-08-01T10:00:00Z",
    };
    expect(hasActiveConsent(whatsappOnly)).toBe(false);
  });

  it("lets an inbound STOP win over the consent that came before it", () => {
    const stopped = {
      ...EMPTY_NOTIFICATION_PREFS,
      channel: "sms" as const,
      smsConsentAt: "2026-08-01T10:00:00Z",
      optedOutAt: "2026-08-09T12:00:00Z",
    };
    expect(hasActiveConsent(stopped)).toBe(false);
  });

  it("honours a fresh opt-in that postdates the STOP", () => {
    const reOptedIn = {
      ...EMPTY_NOTIFICATION_PREFS,
      channel: "sms" as const,
      smsConsentAt: "2026-08-10T09:00:00Z",
      optedOutAt: "2026-08-09T12:00:00Z",
    };
    expect(hasActiveConsent(reOptedIn)).toBe(true);
  });

  it("never reports consent for a channel that is off, whatever the timestamps say", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constant("2026-08-01T10:00:00Z"), { nil: null }),
        fc.option(fc.constant("2026-08-02T10:00:00Z"), { nil: null }),
        fc.option(fc.constant("2026-08-03T10:00:00Z"), { nil: null }),
        (whatsappConsentAt, smsConsentAt, optedOutAt) => {
          expect(
            hasActiveConsent({
              channel: "off",
              phone: "+13055550147",
              whatsappConsentAt,
              smsConsentAt,
              optedOutAt,
            }),
          ).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});
