import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

function MarketingNav() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Logo href="/" wordmarkClassName="text-ink" />

      <nav className="hidden items-center gap-8 sm:flex">
        <Link href="#features" className="text-warm-gray hover:text-ink text-xs font-medium">
          Features
        </Link>
        <Link href="#pricing" className="text-warm-gray hover:text-ink text-xs font-medium">
          Pricing
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="border-paper-line hover:bg-paper-2 text-ink rounded-full border px-4 py-1.5 text-xs font-medium"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="bg-signal hover:bg-signal-dim rounded-full px-4 py-1.5 text-xs font-medium text-white"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-paper-line mx-auto max-w-6xl border-t px-6 py-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Logo href="/" wordmarkClassName="text-warm-gray" size={18} />
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
