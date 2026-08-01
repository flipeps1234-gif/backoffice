/**
 * Browser-side image compression, run BEFORE upload.
 *
 * Three birds: Vercel rejects request bodies over 4.5MB outright (413, before
 * our code runs); OpenAI vision pricing scales with pixel count; and raw
 * phone photos burn the free tier's data transfer. A 3MB photo becomes a
 * ~250KB JPEG that OCRs just as well.
 */

/** Text stays crisply readable at this size; screenshots are usually smaller. */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;
/** Below this, recompression isn't worth the CPU on an old phone. */
const SKIP_BELOW_BYTES = 400 * 1024;

export const compressImage = async (file: File): Promise<File> => {
  if (file.size < SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // White backing: PNG screenshots can be transparent, and transparent
    // pixels turn black in JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    // Formats the browser can't decode (some HEICs) pass through untouched —
    // the server-side extractor may still manage them.
    return file;
  }
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
