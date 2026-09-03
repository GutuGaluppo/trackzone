import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#about', label: 'About' },
  { href: '#docs', label: 'Docs' },
];

function MarketingNav() {
  return (
    <header className="bg-paper-ground">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo href="/" wordmarkClassName="text-ink" />

        <nav className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-warm-gray hover:text-ink text-2xs font-medium uppercase tracking-[0.14em] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/sign-in"
            className="border-ink/25 hover:border-ink/45 text-ink text-2xs rounded-full border px-4 py-2 font-medium uppercase tracking-[0.12em] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-signal hover:bg-signal-dim text-2xs rounded-full px-4 py-2 font-medium uppercase tracking-[0.12em] text-white transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-paper-line border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
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
    <div className="bg-paper text-ink min-h-dvh overflow-x-hidden">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
