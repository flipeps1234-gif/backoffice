import { clientCountry } from "@/lib/request-ip";
import { analyticsAllowedIn } from "@/lib/analytics-region";

/**
 * May this visitor's browser load Google Analytics? Answers only a boolean —
 * never the country — and is private to this visitor: no CDN may reuse it.
 * The public pages ask once per session (analytics.tsx) and load nothing
 * until it says yes; any failure there means no analytics.
 */
export async function GET(request: Request) {
  return Response.json(
    { analytics: analyticsAllowedIn(clientCountry(request.headers)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
