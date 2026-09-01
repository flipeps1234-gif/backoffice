import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { FAQ_KEYS } from "../faq";
import { HELP_SLUGS, isHelpSlug } from "../help";
import { LOCALES, MESSAGES, localeTag, translate, type MessageKey } from "../i18n";
import { blocksToText, parseInline, parseMarkdown, splitTitle } from "../markdown";
import {
  breadcrumbs,
  describeMarkdown,
  faqPage,
  organization,
  pageMetadata,
  softwareApplication,
} from "../seo";
import { CHANNELS, PUBLIC_PAGES, SITE_NAME, TRADES, absolute, isChannel, isTrade } from "../site";
import { APP_VERSION } from "../version";

/**
 * The trilingual dictionary, the help renderer and the public-site
 * metadata. Not money, but the same rule applies: a missing translation
 * ships English onto a Spanish screen, and a drifting key list ships a
 * FAQ page whose structured data does not match what the page says.
 */

describe("the dictionary", () => {
  const keys = Object.keys(MESSAGES) as MessageKey[];

  it("carries all three languages for every single key", () => {
    expect(keys.length).toBeGreaterThan(700);
    for (const key of keys) {
      for (const locale of LOCALES) {
        expect(typeof MESSAGES[key][locale]).toBe("string");
        expect(MESSAGES[key][locale].length).toBeGreaterThan(0);
      }
    }
  });

  it("looks a key up in the language asked for", () => {
    const key = keys[0];
    for (const locale of LOCALES) {
      expect(translate(locale, key)).toBe(MESSAGES[key][locale]);
    }
  });

  it("interpolates every occurrence of a named parameter", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const withParams = keys.filter((k) => MESSAGES[k].en.includes("{"));
        for (const key of withParams.slice(0, 5)) {
          const name = MESSAGES[key].en.match(/\{(\w+)\}/)?.[1];
          if (!name) continue;
          const out = translate("en", key, { [name]: value });
          expect(out).not.toContain(`{${name}}`);
        }
      }),
      { numRuns: 50 },
    );
  });

  it("accepts a number as a parameter without producing NaN or [object Object]", () => {
    const key = keys.find((k) => /\{\w+\}/.test(MESSAGES[k].en))!;
    const name = MESSAGES[key].en.match(/\{(\w+)\}/)![1];
    const out = translate("en", key, { [name]: 42 });
    expect(out).toContain("42");
    expect(out).not.toContain("NaN");
    expect(out).not.toContain("[object");
  });

  it("shows the key rather than crashing a render if one ever goes missing", () => {
    expect(translate("en", "not.a.real.key" as MessageKey)).toBe("not.a.real.key");
  });

  it("maps each language to the tag Intl needs for dates", () => {
    expect(localeTag("en")).toBe("en-US");
    expect(localeTag("es")).toBe("es");
    expect(localeTag("pt")).toBe("pt-BR");
  });

  it("leaves a message with no parameters exactly as written", () => {
    const plain = keys.find((k) => !MESSAGES[k].en.includes("{"))!;
    expect(translate("en", plain, { unused: "x" })).toBe(MESSAGES[plain].en);
  });
});

describe("the FAQ list cannot drift from the dictionary", () => {
  it("names only keys that actually exist, in all three languages", () => {
    expect(FAQ_KEYS.length).toBeGreaterThan(0);
    for (const { q, a } of FAQ_KEYS) {
      expect(MESSAGES[q as MessageKey]).toBeDefined();
      expect(MESSAGES[a as MessageKey]).toBeDefined();
    }
  });

  it("asks each question exactly once", () => {
    const questions = FAQ_KEYS.map((entry) => entry.q);
    expect(new Set(questions).size).toBe(questions.length);
  });
});

describe("the help table of contents", () => {
  it("recognizes its own slugs and nothing else", () => {
    for (const slug of HELP_SLUGS) expect(isHelpSlug(slug)).toBe(true);
    expect(isHelpSlug("made-up")).toBe(false);
    expect(isHelpSlug("")).toBe(false);
  });

  it("keeps every slug distinct, since they are URLs in the wild", () => {
    expect(new Set(HELP_SLUGS).size).toBe(HELP_SLUGS.length);
  });
});

describe("the tiny markdown reader", () => {
  it("reads plain text as one span", () => {
    expect(parseInline("just words")).toEqual([{ kind: "text", text: "just words" }]);
  });

  it("reads bold, code and links", () => {
    expect(parseInline("a **bold** b")).toEqual([
      { kind: "text", text: "a " },
      { kind: "bold", text: "bold" },
      { kind: "text", text: " b" },
    ]);
    expect(parseInline("run `npm test`")).toEqual([
      { kind: "text", text: "run " },
      { kind: "code", text: "npm test" },
    ]);
    expect(parseInline("see [the docs](https://example.com)")).toEqual([
      { kind: "text", text: "see " },
      { kind: "link", text: "the docs", href: "https://example.com" },
    ]);
  });

  it("reads headings, paragraphs and dash lists", () => {
    const blocks = parseMarkdown(
      ["# Title", "", "## Section", "", "A paragraph", "", "- one", "- two"].join("\n"),
    );
    expect(blocks[0]).toEqual({ kind: "h1", text: "Title" });
    expect(blocks[1]).toEqual({ kind: "h2", text: "Section" });
    expect(blocks[2]).toMatchObject({ kind: "p" });
    expect(blocks[3]).toMatchObject({ kind: "ul" });
    expect((blocks[3] as { items: unknown[] }).items).toHaveLength(2);
  });

  it("joins wrapped lines into one paragraph", () => {
    const blocks = parseMarkdown("one line\nand its continuation");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      kind: "p",
      spans: [{ kind: "text", text: "one line and its continuation" }],
    });
  });

  it("never passes author HTML through as markup", () => {
    const blocks = parseMarkdown("<script>alert(1)</script>");
    expect(blocks).toEqual([
      { kind: "p", spans: [{ kind: "text", text: "<script>alert(1)</script>" }] },
    ]);
  });

  it("reads any string at all without throwing", () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        expect(() => parseMarkdown(source)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("produces nothing from an empty document", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n\n")).toEqual([]);
  });

  it("closes an open list when prose follows it without a blank line", () => {
    const blocks = parseMarkdown(["- one", "- two", "back to prose"].join("\n"));
    expect(blocks.map((b) => b.kind)).toEqual(["ul", "p"]);
  });

  it("closes an open paragraph when a list follows it without a blank line", () => {
    const blocks = parseMarkdown(["some prose", "- one"].join("\n"));
    expect(blocks.map((b) => b.kind)).toEqual(["p", "ul"]);
  });

  it("closes both when a heading interrupts them", () => {
    const blocks = parseMarkdown(["prose", "## Section", "- one", "# Title"].join("\n"));
    expect(blocks.map((b) => b.kind)).toEqual(["p", "h2", "ul", "h1"]);
  });

  it("takes the first heading as the article's title and leaves the rest as the body", () => {
    const blocks = parseMarkdown("# Getting started\n\nFirst paragraph.");
    expect(splitTitle(blocks)).toEqual({
      title: "Getting started",
      body: [blocks[1]],
    });
  });

  it("leaves the title empty for an article that does not open with a heading", () => {
    const blocks = parseMarkdown("Just prose.");
    expect(splitTitle(blocks)).toEqual({ title: "", body: blocks });
    expect(splitTitle([])).toEqual({ title: "", body: [] });
  });

  it("flattens an article to plain text for the help search to match against", () => {
    const blocks = parseMarkdown(
      ["# Title", "", "## Section", "", "A **bold** word and `code`.", "", "- an item"].join("\n"),
    );
    const text = blocksToText(blocks);
    expect(text).toContain("Title");
    expect(text).toContain("Section");
    expect(text).toContain("bold");
    expect(text).toContain("code");
    expect(text).toContain("an item");
    expect(text).not.toContain("**");
    expect(text).not.toContain("#");
  });
});

describe("the public site's metadata", () => {
  it("builds absolute URLs from the site root", () => {
    expect(absolute("/help")).toMatch(/^https?:\/\/.+\/help$/);
  });

  it("recognizes the trades and channels it has pages for", () => {
    for (const trade of TRADES) expect(isTrade(trade)).toBe(true);
    for (const channel of CHANNELS) expect(isChannel(channel)).toBe(true);
    expect(isTrade("plumbers")).toBe(false);
    expect(isChannel("paypal")).toBe(false);
  });

  it("lists every public page exactly once", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every page a canonical URL and the site name", () => {
    const meta = pageMetadata({
      title: "Help",
      description: "How it works",
      path: "/help",
    });
    expect(meta.title).toContain("Help");
    expect(JSON.stringify(meta)).toContain(SITE_NAME);
    expect(JSON.stringify(meta)).toContain("/help");
  });

  it("builds breadcrumb, organization, application and FAQ structured data", () => {
    expect(breadcrumbs([{ name: "Help", path: "/help" }])).toMatchObject({
      "@type": "BreadcrumbList",
    });
    expect(organization()).toMatchObject({ "@type": "Organization" });
    expect(softwareApplication("Books from payment screenshots")).toMatchObject({
      "@type": "SoftwareApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
    const faq = faqPage([{ q: "Is it free?", a: "Yes." }]);
    expect(faq).toMatchObject({ "@type": "FAQPage" });
    expect(faq.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Is it free?",
        acceptedAnswer: { "@type": "Answer", text: "Yes." },
      },
    ]);
  });

  it("says the price is zero in the markup, because it is", () => {
    const markup = softwareApplication("anything");
    expect(markup.offers).toEqual({
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    });
  });

  it("cuts a long description at a word boundary rather than mid-word", () => {
    const long = `${"word ".repeat(60)}end`;
    const description = describeMarkdown(long);
    expect(description.endsWith("…")).toBe(true);
    expect(description).not.toMatch(/wor…$/);
  });

  it("describes an article by its prose, with the markup taken out", () => {
    const description = describeMarkdown(
      "# Title\n\nThe **first** paragraph explains things.\n\n- a list item",
    );
    expect(description).not.toContain("#");
    expect(description).not.toContain("**");
    expect(description).toContain("first");
  });

  it("keeps a description short enough for a search result", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 800 }), (markdown) => {
        expect(describeMarkdown(markdown).length).toBeLessThanOrEqual(155);
      }),
      { numRuns: 300 },
    );
  });
});

describe("the product's own version number", () => {
  it("is a version, not build tooling's", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+(\.\d+)?$/);
  });
});
