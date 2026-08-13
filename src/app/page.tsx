import UploadScreen from "./upload-screen";

/** The two-cards mark, drawn in the page's own text color so it works in
 *  both themes. The favicon (icon.svg) is the same mark on black. */
function Mark() {
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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 lg:max-w-5xl lg:px-8">
      <h1 className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Mark />
        contado
      </h1>
      <UploadScreen />
    </main>
  );
}
