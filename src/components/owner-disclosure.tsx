import type { ReactNode } from "react";

// Clean, JS-free disclosure: a solid (or ghost) button that reveals its
// content below. The button look lives on an inner <span> so the <summary>
// keeps its default display and native toggle behavior stays reliable.
export function OwnerDisclosure({
  label,
  children,
  variant = "primary",
  open = false,
  dark = false,
}: {
  label: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  open?: boolean;
  // `dark` renders the control for the near-black site theme (used by the
  // owner console on restyled catalog pages). Default stays light for /admin
  // and not-yet-restyled pages.
  dark?: boolean;
}) {
  const looks = {
    light: {
      primary: "bg-ink text-surface px-4 py-2 text-sm rounded-lg",
      danger: "border border-red-300 text-red-700 px-3 py-1.5 text-xs rounded-md",
      ghost: "border border-black/15 px-3 py-1.5 text-xs rounded-md",
      panel: "border-black/10 bg-white",
    },
    dark: {
      primary: "bg-accent text-white px-4 py-2 text-sm rounded-lg",
      danger: "border border-red-400/60 text-red-300 px-3 py-1.5 text-xs rounded-md",
      ghost: "border border-white/25 text-surface px-3 py-1.5 text-xs rounded-md",
      panel: "border-white/10 bg-white/[0.03]",
    },
  };
  const t = dark ? looks.dark : looks.light;
  const look = t[variant];

  return (
    <details open={open} className="group">
      <summary className="inline-block w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span
          className={`inline-flex select-none items-center gap-1.5 font-medium ${look}`}
        >
          <span className="transition-transform group-open:rotate-45">+</span>
          <span>{label}</span>
        </span>
      </summary>
      <div className={`mt-3 rounded-xl border p-4 text-start ${t.panel}`}>
        {children}
      </div>
    </details>
  );
}
