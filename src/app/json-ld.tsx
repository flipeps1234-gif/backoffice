/**
 * Structured data the way the Next guide recommends: a JSON-LD script in
 * the page itself. `<` is escaped so a string in the payload can never
 * close the script tag — the payload here is our own copy, but the
 * escape costs nothing and removes the question.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
