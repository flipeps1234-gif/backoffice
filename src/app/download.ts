"use client";

/**
 * One CSV-download helper for dashboard + settings — DOM, so src/app.
 *
 * The anchor is attached before the click and the blob URL lives on for a
 * minute: a `download` navigation fetches the blob AFTER the current task,
 * and WebKit has failed such downloads when the URL was already revoked
 * (compat lens, 2026-10-05). In-app browsers (Instagram, Facebook, a mail
 * app's WKWebView) have no download manager at all. Where the browser
 * also lacks the `download` attribute (Android WebViews) the share sheet
 * carries the file instead when it can; WKWebView advertises `download`
 * even though it cannot save, so iOS in-app browsers still get the plain
 * attempt — the most any page can do there.
 */
export function downloadCsv(csv: string, filename: string) {
  const type = "text/csv;charset=utf-8";
  const blob = new Blob([csv], { type });
  const anchorDownloads = "download" in HTMLAnchorElement.prototype;
  if (!anchorDownloads && typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type });
      if (navigator.canShare?.({ files: [file] })) {
        void navigator.share({ files: [file], title: filename }).catch(() => {
          // The sheet was dismissed, or the host app refused: nothing to undo.
        });
        return;
      }
    } catch {
      // File or share unsupported: fall through to the anchor.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
