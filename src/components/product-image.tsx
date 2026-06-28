import Image from "next/image";

// Renders an optional product image inside a fixed-aspect box. When no image
// is set, shows a neutral placeholder so layouts stay consistent.
export function ProductImage({
  src,
  alt,
  aspect = "aspect-[4/3]",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  aspect?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`relative ${aspect} w-full overflow-hidden rounded-lg bg-black/5`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-ink/25">
          {/* Simple image-placeholder glyph */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}
