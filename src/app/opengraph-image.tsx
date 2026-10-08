import { ImageResponse } from "next/og";
import { OG_IMAGE_ALT, OG_IMAGE_TEXT } from "@/lib/seo";

/**
 * The share card, drawn from design-tokens.md and nothing else: the
 * dark background pair (#0a0a0a / #ededed), the two-cards mark, the
 * wordmark, and the hero line. No gradients, no glow — the card is a
 * well-made receipt, same as the pages it fronts. The words live in
 * lib/seo.ts (OG_IMAGE_TEXT) so the alt text always carries them.
 */

export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          color: "#ededed",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg viewBox="0 0 96 96" width="72" height="72">
            <rect
              x="34"
              y="20"
              width="52"
              height="34"
              rx="17"
              fill="none"
              stroke="#ededed"
              strokeWidth="9"
            />
            <g transform="rotate(-12 38 58)">
              <rect
                x="8"
                y="40"
                width="58"
                height="36"
                rx="18"
                fill="#0a0a0a"
                stroke="#ededed"
                strokeWidth="9"
              />
            </g>
          </svg>
          <div style={{ fontSize: "56px", fontWeight: 600 }}>contado</div>
        </div>
        <div
          style={{
            marginTop: "48px",
            fontSize: "44px",
            fontWeight: 600,
            lineHeight: 1.25,
            maxWidth: "980px",
          }}
        >
          {OG_IMAGE_TEXT.headline}
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "28px",
            color: "#a3a3a3",
          }}
        >
          {OG_IMAGE_TEXT.sub}
        </div>
      </div>
    ),
    size,
  );
}
