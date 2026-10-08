/**
 * Browser-side image compression, run BEFORE upload.
 *
 * Three birds: Vercel rejects request bodies over 4.5MB outright (413, before
 * our code runs); OpenAI vision pricing scales with pixel count; and raw
 * phone photos burn the free tier's data transfer. A 3MB photo becomes a
 * ~250KB JPEG that OCRs just as well.
 *
 * And one rule that is not about size: a camera photo carries EXIF — the
 * GPS position it was taken at (a customer's driveway), the time, the
 * phone. The canvas re-encode below keeps only the pixels, so a JPEG or
 * WebP ALWAYS goes through it, however small, and the re-encode is kept
 * even when it comes out bigger. Only screenshot formats, which carry no
 * camera block, may skip it.
 */

/** Text stays crisply readable at this size; screenshots are usually smaller. */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;
/** Below this, recompression isn't worth the CPU on an old phone — for the
 *  formats in NO_CAMERA_METADATA only. */
const SKIP_BELOW_BYTES = 400 * 1024;
/** The lossless screenshot formats: no EXIF block from a camera. Anything
 *  else (JPEG, WebP, HEIC…) may carry one and is always re-encoded. */
const NO_CAMERA_METADATA = new Set(["image/png", "image/gif"]);

export const compressImage = async (file: File): Promise<File> => {
  const mayCarryExif = !NO_CAMERA_METADATA.has(file.type);
  if (!mayCarryExif && file.size < SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return withoutMetadata(file);
    // White backing: PNG screenshots can be transparent, and transparent
    // pixels turn black in JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) return withoutMetadata(file);
    // A bigger re-encode is still the one to send when it is what drops
    // the EXIF; for a screenshot format, the smaller file wins.
    if (!mayCarryExif && blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    // Formats the browser can't decode (some HEICs) pass through — the
    // server-side extractor may still manage them — but a JPEG or WebP
    // first loses its metadata bytes (withoutMetadata).
    return withoutMetadata(file);
  }
};

/**
 * The fallback when the canvas can't run (a decode failure, no 2D context,
 * a refused export): strip the metadata at the byte level instead. It
 * keeps the pixels untouched, so a photo shot sideways may arrive sideways
 * (EXIF also held its orientation) — a sideways photo still reads; a
 * location sent to OpenAI can't be unsent. Formats it can't parse go
 * through as they are, which is what happened to everything before.
 */
const withoutMetadata = async (file: File): Promise<File> => {
  try {
    const stripped = stripMetadata(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
    return stripped
      ? new File([stripped], file.name, { type: file.type })
      : file;
  } catch {
    return file;
  }
};

/**
 * JPEG or WebP bytes with the metadata blocks removed, or null when the
 * bytes aren't a well-formed file of that type. Pure — no DOM — so the
 * unit tests drive it directly.
 *
 * JPEG: walks the header segments up to the first scan (SOS) and drops
 * APP1 (EXIF and XMP — the GPS lives here), APP3–APP13 and APP15 (maker
 * and Photoshop/IPTC blocks) and comments. Keeps APP0 (JFIF), APP2 (ICC
 * colour) and APP14 (Adobe — decoders need it for CMYK files).
 * WebP: drops the EXIF and XMP chunks, clears their two flags in VP8X and
 * rewrites the RIFF size.
 */
export const stripMetadata = (
  bytes: Uint8Array,
  type: string,
): Uint8Array<ArrayBuffer> | null => {
  if (type === "image/jpeg") return stripJpeg(bytes);
  if (type === "image/webp") return stripWebp(bytes);
  return null;
};

const KEEP_APP = new Set([0xe0, 0xe2, 0xee]);

const stripJpeg = (bytes: Uint8Array): Uint8Array<ArrayBuffer> | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  for (;;) {
    if (i + 1 >= bytes.length || bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte before a marker
      continue;
    }
    // SOS: everything from here on is image data — copied as is.
    if (marker === 0xda) {
      kept.push(bytes.subarray(i));
      break;
    }
    if (marker === 0xd9) return null; // EOI before any image data
    // Standalone markers (TEM, RSTn) have no length field.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      kept.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > bytes.length) return null;
    const end = i + 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    if (end < i + 4 || end > bytes.length) return null;
    const metadata =
      marker === 0xfe ||
      (marker >= 0xe1 && marker <= 0xef && !KEEP_APP.has(marker));
    if (!metadata) kept.push(bytes.subarray(i, end));
    i = end;
  }
  return concat(kept);
};

const ascii = (bytes: Uint8Array, at: number) =>
  String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

const readU32 = (bytes: Uint8Array, at: number) =>
  (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;

const stripWebp = (bytes: Uint8Array): Uint8Array<ArrayBuffer> | null => {
  if (bytes.length < 12 || ascii(bytes, 0) !== "RIFF" || ascii(bytes, 8) !== "WEBP") {
    return null;
  }
  const kept: Uint8Array[] = [];
  let i = 12;
  while (i < bytes.length) {
    if (i + 8 > bytes.length) return null;
    const fourcc = ascii(bytes, i);
    const size = readU32(bytes, i + 4);
    // Chunks are padded to an even length.
    const end = i + 8 + size + (size % 2);
    if (end > bytes.length) return null;
    if (fourcc === "VP8X") {
      const chunk = bytes.slice(i, end);
      chunk[8] &= ~0x0c; // the EXIF (0x08) and XMP (0x04) flags
      kept.push(chunk);
    } else if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      kept.push(bytes.subarray(i, end));
    }
    i = end;
  }
  const body = concat(kept);
  const out = new Uint8Array(12 + body.length);
  out.set(bytes.subarray(0, 12));
  out.set(body, 12);
  const riffSize = out.length - 8;
  out[4] = riffSize & 0xff;
  out[5] = (riffSize >>> 8) & 0xff;
  out[6] = (riffSize >>> 16) & 0xff;
  out[7] = (riffSize >>> 24) & 0xff;
  return out;
};

const concat = (parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

/**
 * Split files into upload chunks that stay safely under Vercel's 4.5MB
 * request-body cap (multipart adds overhead, so aim lower).
 */
const CHUNK_BUDGET_BYTES = 3_500_000;
const CHUNK_MAX_FILES = 4;

export const chunkForUpload = (files: File[]): File[][] => {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const wouldOverflow =
      current.length > 0 &&
      (currentBytes + file.size > CHUNK_BUDGET_BYTES ||
        current.length >= CHUNK_MAX_FILES);
    if (wouldOverflow) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};
