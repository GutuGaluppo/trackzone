import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-paper flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-warm-gray font-mono text-xs tracking-[0.2em]">404</p>
      <h1 className="text-ink text-lg font-medium">Not found</h1>
      <p className="text-warm-gray max-w-xs text-sm">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link href="/" className="text-ink mt-2 text-sm font-medium underline underline-offset-2">
        Back to TrackZone
      </Link>
    </div>
  );
}
