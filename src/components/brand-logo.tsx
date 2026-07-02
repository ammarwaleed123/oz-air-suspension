import Image from "next/image";

// The OZ lockup (red "A.OZ" mark + "LOW GANG" + "Coil Over & Air Suspension"),
// supplied on a black field — so it sits directly on the near-black chrome.
// `className` controls the rendered height; width stays auto via the wrapper.
export function BrandLogo({
  className = "h-9",
  priority = false,
  alt = "OZ — Low Gang · Coil Over & Air Suspension",
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/brand/oz-logo.png"
      alt={alt}
      width={520}
      height={200}
      priority={priority}
      className={`${className} w-auto select-none`}
    />
  );
}
