/** The two-cards mark, drawn in the page's own text color so it works in
 *  both themes. The favicon (icon.svg) is the same mark on black. Shared
 *  by the app header and the public pages — one mark, one file. */
export default function Mark() {
  return (
    <svg viewBox="0 0 96 96" className="h-6 w-6" aria-hidden="true">
      <rect
        x="34"
        y="20"
        width="52"
        height="34"
        rx="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
      />
      <g transform="rotate(-12 38 58)">
        <rect
          x="8"
          y="40"
          width="58"
          height="36"
          rx="18"
          fill="var(--background)"
          stroke="currentColor"
          strokeWidth="9"
        />
      </g>
    </svg>
  );
}
