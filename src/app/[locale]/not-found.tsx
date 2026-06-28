import Link from "next/link";

// 404 within a locale segment. The locale layout supplies <html>, header and
// footer, so this only needs to render page content.
export default function LocaleNotFound() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-32 text-center">
      <h1 className="text-5xl font-black">404</h1>
      <p className="text-ink/60">الصفحة غير موجودة · Page not found</p>
      <Link href="/" className="font-semibold text-accent underline">
        الرئيسية / Home
      </Link>
    </div>
  );
}
