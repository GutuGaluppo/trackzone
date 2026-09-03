import Link from 'next/link';

function MarketingNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="text-ink font-mono text-xs tracking-[0.2em]">
        TRACKZONE<span className="text-signal">.</span>
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/sign-in" className="text-ink/80 hover:text-ink text-xs font-medium">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="bg-ink text-paper hover:bg-ink/90 rounded-sm px-3 py-1.5 text-xs font-medium"
        >
          Get Started Free
        </Link>
      </nav>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-paper-line mx-auto max-w-6xl border-t px-6 py-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <span className="text-warm-gray font-mono text-xs tracking-[0.2em]">TRACKZONE</span>
        <p className="text-warm-gray text-xs">
          Built for DJs, producers, musicians, sound designers and podcasters.
        </p>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper text-ink min-h-dvh">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
