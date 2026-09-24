import type { ReactNode } from "react";

/* Shared bits for the /demooo screens: the design tokens' card, buttons
   and inputs, and the stroke icons. */

export const card = "rounded-xl border border-neutral-300 bg-white";
export const primaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50";
export const smallBtn =
  "inline-flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 text-sm transition-colors hover:bg-neutral-100";
export const input =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-[#a3a3a3] focus:border-neutral-900 focus:outline-none";
export const label = "text-xs font-medium text-[#525252]";
/** Secondary text on white. Hex, not neutral-500, so the app's dark-mode
 *  remap of neutral-500 can't wash it out on these always-light cards. */
export const muted = "text-[#737373]";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex gap-1 rounded-full border border-neutral-300 bg-white p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 whitespace-nowrap rounded-full px-3.5 text-sm transition-colors ${
            value === o.value ? "bg-neutral-900 text-white" : "text-[#525252] hover:bg-neutral-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ScreenHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-[#525252]">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  Dashboard: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  "Log sale": <path d="M12 5v14M5 12h14" />,
  "Log expense": (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  Owed: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  Clients: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 3 3 6" />
    </>
  ),
  "Products and services": (
    <>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </>
  ),
  History: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  Settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  upload: <path d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  car: (
    <>
      <path d="M4 16v-4l2-5h12l2 5v4z" />
      <path d="M4 16v2M20 16v2" />
      <circle cx="8" cy="13.5" r="1" />
      <circle cx="16" cy="13.5" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`flex-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function AgeChip({ days }: { days: number }) {
  const tone =
    days > 60
      ? "bg-red-50 text-red-700 ring-red-200"
      : days > 30
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-neutral-100 text-[#525252] ring-neutral-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tone}`}>
      {days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`}
    </span>
  );
}
