/**
 * A deliberately tiny markdown reader for /help-docs — the grammar the
 * help articles actually use and nothing more: #/## headings, dash
 * lists, paragraphs, and inline **bold**, `code`, [text](href). No
 * dependency (boring wins), no HTML passthrough (author markdown can
 * never inject markup), pure string → tree so it harness-tests like
 * every other lib module.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; spans: Inline[] }
  | { kind: "ul"; items: Inline[][] };

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export const parseInline = (text: string): Inline[] => {
  const spans: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ kind: "text", text: text.slice(last, index) });
    const token = match[0];
    if (token.startsWith("**")) {
      spans.push({ kind: "bold", text: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      spans.push({ kind: "code", text: token.slice(1, -1) });
    } else {
      const split = token.indexOf("](");
      spans.push({
        kind: "link",
        text: token.slice(1, split),
        href: token.slice(split + 2, -1),
      });
    }
    last = index + token.length;
  }
  if (last < text.length) spans.push({ kind: "text", text: text.slice(last) });
  return spans;
};

export const parseMarkdown = (source: string): Block[] => {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", spans: parseInline(paragraph.join(" ")) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list && list.length > 0) blocks.push({ kind: "ul", items: list });
    list = null;
  };

  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
    } else if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
    } else if (line.startsWith("- ")) {
      flushParagraph();
      list ??= [];
      list.push(parseInline(line.slice(2).trim()));
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
};

/** The first h1 is the article's title; everything else is the body. */
export const splitTitle = (
  blocks: Block[],
): { title: string; body: Block[] } => {
  const first = blocks[0];
  if (first?.kind === "h1") return { title: first.text, body: blocks.slice(1) };
  return { title: "", body: blocks };
};

/** Plain text of every block — what the help search matches against. */
export const blocksToText = (blocks: Block[]): string =>
  blocks
    .map((block) => {
      if (block.kind === "h1" || block.kind === "h2") return block.text;
      if (block.kind === "p") return block.spans.map((s) => s.text).join("");
      return block.items
        .map((item) => item.map((s) => s.text).join(""))
        .join(" ");
    })
    .join(" ");
