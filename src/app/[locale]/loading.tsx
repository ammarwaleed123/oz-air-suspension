// Shown instantly on every navigation under [locale] while the destination
// server component (and its DB reads) stream in. Without this, App Router
// blocks the whole navigation until the page is ready, which feels frozen.
export default function Loading() {
  return (
    <div className="grow bg-ink flex items-center justify-center py-40">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-accent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
