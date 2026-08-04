/**
 * What the vision endpoint accepts. Shared, because the browser and the API
 * route both have to agree: if the client is looser, an unsupported file
 * reaches the server, comes back 400, and aborts every remaining chunk of
 * the batch — the user loses good screenshots because one was a HEIC.
 */
export const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const isSupportedImage = (file: File): boolean =>
  IMAGE_TYPES.has(file.type);
