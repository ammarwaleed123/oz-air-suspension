// Plain submit button for destructive actions. (No browser confirm dialog —
// the owner asked to remove it.) `confirmText` is accepted but unused so call
// sites don't need to change.
export function ConfirmButton({
  children,
  className,
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  return (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}
