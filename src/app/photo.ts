"use client";

/**
 * Sale photo compression — v0.6. Lives in src/app, not src/lib, because
 * canvas is DOM and the lib stays pure.
 *
 * The photo is proof-of-work ("here's the finished lawn"), not archival:
 * it gets downscaled hard and stored as a JPEG data URL in the sale row
 * itself. A text column is the boring answer — no storage buckets, no
 * signed URLs, no second RLS surface, and the row-level policies that
 * already protect the sale protect its photo. The cost is a size budget,
 * enforced here: ~300KB after base64, retrying smaller until it fits.
 */

const BUDGET_BYTES = 300_000;

/** data URLs are base64: 4 chars ≈ 3 bytes. */
const approxBytes = (dataUrl: string): number =>
  Math.round(dataUrl.length * 0.75);

const draw = (
  bitmap: ImageBitmap,
  maxDim: number,
  quality: number,
): string => {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
};

/**
 * Throws on non-images and decode failures — the caller shows one
 * friendly message; a sale must never be blocked by its decoration.
 */
export const compressPhoto = async (file: File): Promise<string> => {
  const bitmap = await createImageBitmap(file);
  try {
    // Progressively smaller until the budget fits. The last rung is a
    // floor, not a guarantee — but 640px at q0.35 is far under budget
    // for anything a phone camera produces.
    const rungs: [number, number][] = [
      [1280, 0.7],
      [1024, 0.55],
      [800, 0.45],
      [640, 0.35],
    ];
    let out = "";
    for (const [maxDim, quality] of rungs) {
      out = draw(bitmap, maxDim, quality);
      if (approxBytes(out) <= BUDGET_BYTES) return out;
    }
    return out;
  } finally {
    bitmap.close();
  }
};
