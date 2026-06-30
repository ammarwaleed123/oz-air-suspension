import type { ReactNode } from "react";

// Clean, JS-free disclosure: a solid (or ghost) button that reveals its
// content below. The button look lives on an inner <span> so the <summary>
// keeps its default display and native toggle behavior stays reliable.
export function OwnerDisclosure({
  label,
  children,
  variant = "primary",
  open = false,
}: {
  label: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger";
  open?: boolean;
}) {
  const look =
    variant === "primary"
      ? "bg-ink text-surface px-4 py-2 text-sm rounded-lg"
      : variant === "danger"
        ? "border border-red-300 text-red-700 px-3 py-1.5 text-xs rounded-md"
        : "border border-black/15 px-3 py-1.5 text-xs rounded-md";

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
      <div className="mt-3 rounded-xl border border-black/10 bg-white p-4 text-start">
        {children}
      </div>
    </details>
  );
}
