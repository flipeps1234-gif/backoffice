/**
 * The database caps text columns in BYTES (migrations 0020/0021:
 * octet_length). The inputs cap characters (maxLength), which a multi-byte
 * alphabet or emoji can still carry past the bytes, and an over-long row is
 * refused by Postgres with a "reload and re-enter" line that fails the same
 * way forever (pass-8 schema review). The write wrappers clamp to the
 * column's bytes, so the row the user sees is the row that lands — minus,
 * at most, a tail the input had already told them not to type.
 */
export const TEXT_BYTES = {
  name: 400,
  payer: 400,
  memo: 4000,
  notes: 8000,
  category: 200,
  state: 16,
  phone: 32,
} as const;

export const clampBytes = (value: string, maxBytes: number): string => {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length <= maxBytes) return value;
  // Cut on a code-point boundary: a split sequence decodes to U+FFFD.
  return new TextDecoder("utf-8").decode(bytes.slice(0, maxBytes)).replace(/\uFFFD$/, "");
};
