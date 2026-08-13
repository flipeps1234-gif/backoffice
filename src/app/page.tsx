import LocalePicker from "./locale-picker";
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
      {/* The picker lives in the permanent header — every screen, every
          state, including signed-out. A language switcher you have to hunt
          for might as well not exist. */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Mark />
          contado
        </h1>
        <LocalePicker compact />
      </div>
      <UploadScreen />
    </main>
  );
}
