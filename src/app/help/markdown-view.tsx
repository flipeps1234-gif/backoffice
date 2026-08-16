"use client";

import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";

/** Renders the help-docs markdown in the app's own type scale — nothing
 *  here that design-tokens.md doesn't list. */

function Spans({ spans }: { spans: Inline[] }) {
  return (
    <>
      {spans.map((span, i) => {
        if (span.kind === "bold")
          return (
            <strong key={i} className="font-semibold">
              {span.text}
            </strong>
          );
        if (span.kind === "code")
          return (
            <code key={i} className="rounded bg-neutral-100 px-1 font-mono text-[0.9em] dark:bg-neutral-800">
              {span.text}
            </code>
          );
        if (span.kind === "link")
          return (
            <a key={i} href={span.href} className="font-medium underline">
              {span.text}
            </a>
          );
        return <span key={i}>{span.text}</span>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "h1":
      return <h1 className="text-lg font-semibold tracking-tight">{block.text}</h1>;
    case "h2":
      return <h2 className="pt-2 text-base font-semibold">{block.text}</h2>;
    case "p":
      return (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <Spans spans={block.spans} />
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {block.items.map((item, i) => (
            <li key={i}>
              <Spans spans={item} />
            </li>
          ))}
        </ul>
      );
  }
}

export default function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
